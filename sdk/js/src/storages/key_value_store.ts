/**
 * KeyValueStore — JS/TS storage class.
 *
 * Remote mode: calls /api/storage/kv-stores/{id}/records/...
 * Local mode: reads/writes files in {SCRAPI_LOCAL_STORAGE_DIR}/key_value_stores/{id}/
 */
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import type { ScrapiClient } from '../client/scrapi_client';
import type { KeyInfo } from '../models';

export class KeyValueStore {
  constructor(
    private readonly storeId: string,
    private readonly client: ScrapiClient | null = null,
  ) {}

  get id(): string { return this.storeId; }

  async getValue<T = unknown>(key: string): Promise<T | null> {
    if (!this.client) return this._localGet<T>(key);
    try {
      const { data, contentType } = await this.client.getRaw(
        `/api/storage/kv-stores/${this.storeId}/records/${key}`
      );
      return this._parse<T>(data, contentType);
    } catch (e: any) {
      if (e?.status === 404) return null;
      throw e;
    }
  }

  async setValue(key: string, value: unknown, options?: { contentType?: string }): Promise<void> {
    // value=null → delete
    if (value === null || value === undefined) {
      await this.deleteValue(key);
      return;
    }
    const ct = options?.contentType ?? this._detectCt(value);
    if (!this.client) {
      this._localSet(key, value, ct);
      return;
    }
    const raw = this._serialize(value, ct);
    await this.client.putRaw(
      `/api/storage/kv-stores/${this.storeId}/records/${key}`, raw, ct
    );
  }

  async deleteValue(key: string): Promise<void> {
    if (!this.client) { this._localDelete(key); return; }
    try {
      await this.client.delete(`/api/storage/kv-stores/${this.storeId}/records/${key}`);
    } catch (e: any) {
      if (e?.status !== 404) throw e;
    }
  }

  async forEachKey(
    iteratee: (key: string, index: number, info: KeyInfo) => Promise<void>
  ): Promise<void> {
    if (!this.client) {
      let i = 0;
      for (const [k, info] of this._localKeys()) {
        await iteratee(k, i++, info);
      }
      return;
    }
    let cursor: string | undefined;
    let i = 0;
    do {
      const result = await this.client.get<any>(
        `/api/storage/kv-stores/${this.storeId}/records`,
        { limit: 200, ...(cursor ? { exclusiveStartKey: cursor } : {}) }
      );
      for (const item of result.items ?? []) {
        await iteratee(item.key, i++, {
          key: item.key,
          size: item.size_bytes ?? 0,
          contentType: item.content_type ?? '',
        });
      }
      cursor = result.nextExclusiveStartKey;
    } while (cursor);
  }

  async getPublicUrl(key: string): Promise<string> {
    return `${config.baseUrl}/api/storage/kv-stores/${this.storeId}/records/${key}`;
  }

  async drop(): Promise<void> {
    if (!this.client) {
      const p = this._localPath();
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true });
      return;
    }
    await this.client.delete(`/api/storage/kv-stores/${this.storeId}`);
  }

  // ── Local helpers ────────────────────────────────────────────────────────

  private _localPath(): string {
    return path.join(config.localStorageDir, 'key_value_stores', this.storeId);
  }

  private _localGet<T>(key: string): T | null {
    const dir = this._localPath();
    if (!fs.existsSync(dir)) return null;
    for (const f of fs.readdirSync(dir)) {
      const stem = path.parse(f).name;
      const ext = path.parse(f).ext.toLowerCase();
      if (stem !== key) continue;
      const full = path.join(dir, f);
      if (ext === '.json') return JSON.parse(fs.readFileSync(full, 'utf-8')) as T;
      if (ext === '.txt') return fs.readFileSync(full, 'utf-8') as unknown as T;
      return fs.readFileSync(full) as unknown as T;
    }
    return null;
  }

  private _localSet(key: string, value: unknown, ct: string): void {
    const dir = this._localPath();
    fs.mkdirSync(dir, { recursive: true });
    if (typeof value === 'object' && !Buffer.isBuffer(value)) {
      fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(value, null, 2));
    } else if (typeof value === 'string') {
      fs.writeFileSync(path.join(dir, `${key}.txt`), value);
    } else {
      const ext = this._ctToExt(ct);
      fs.writeFileSync(path.join(dir, `${key}${ext}`), value as Buffer);
    }
  }

  private _localDelete(key: string): void {
    const dir = this._localPath();
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      if (path.parse(f).name === key) fs.unlinkSync(path.join(dir, f));
    }
  }

  private *_localKeys(): Generator<[string, KeyInfo]> {
    const dir = this._localPath();
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      yield [path.parse(f).name, {
        key: path.parse(f).name,
        size: stat.size,
        contentType: this._extToCt(path.parse(f).ext),
      }];
    }
  }

  private _detectCt(value: unknown): string {
    if (typeof value === 'object' && !Buffer.isBuffer(value)) return 'application/json';
    if (typeof value === 'string') return 'text/plain; charset=utf-8';
    return 'application/octet-stream';
  }

  private _serialize(value: unknown, ct: string): string | ArrayBuffer {
    const base = ct.split(';')[0].trim().toLowerCase();
    if (base === 'application/json') return JSON.stringify(value);
    if (typeof value === 'string') return value;
    if (Buffer.isBuffer(value)) return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
    return JSON.stringify(value);
  }

  private _parse<T>(data: ArrayBuffer, ct: string): T {
    const base = ct.split(';')[0].trim().toLowerCase();
    if (base === 'application/json') return JSON.parse(Buffer.from(data).toString('utf-8'));
    if (base.startsWith('text/')) return Buffer.from(data).toString('utf-8') as unknown as T;
    return Buffer.from(data) as unknown as T;
  }

  private _ctToExt(ct: string): string {
    const map: Record<string, string> = {
      'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif',
      'application/pdf': '.pdf', 'text/html': '.html', 'text/csv': '.csv',
    };
    return map[ct.split(';')[0].trim().toLowerCase()] ?? '.bin';
  }

  private _extToCt(ext: string): string {
    const map: Record<string, string> = {
      '.json': 'application/json', '.txt': 'text/plain',
      '.png': 'image/png', '.jpg': 'image/jpeg',
      '.pdf': 'application/pdf', '.html': 'text/html', '.csv': 'text/csv',
    };
    return map[ext.toLowerCase()] ?? 'application/octet-stream';
  }
}
