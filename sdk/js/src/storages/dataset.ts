/**
 * Dataset — JS/TS storage class.
 * Append-only table for structured crawling results.
 */
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import type { ScrapiClient } from '../client/scrapi_client';
import type { DatasetContent } from '../models';

export class Dataset<T extends Record<string, unknown> = Record<string, unknown>> {
  constructor(
    private readonly datasetId: string,
    private readonly client: ScrapiClient | null = null,
  ) {}

  get id(): string { return this.datasetId; }

  async pushData(data: T | T[]): Promise<void> {
    const items = Array.isArray(data) ? data : [data];
    if (!this.client) { this._localPush(items); return; }
    await this.client.post(`/api/storage/datasets/${this.datasetId}/items`, items);
  }

  async getData(options?: {
    offset?: number; limit?: number; fields?: string[]; desc?: boolean;
  }): Promise<DatasetContent<T>> {
    const { offset = 0, limit = 250, fields, desc = false } = options ?? {};
    if (!this.client) return this._localGet(offset, limit) as DatasetContent<T>;
    const params: Record<string, unknown> = { offset, limit, desc: String(desc) };
    if (fields?.length) params.fields = fields.join(',');
    return this.client.get<DatasetContent<T>>(`/api/storage/datasets/${this.datasetId}/items`, params);
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    let offset = 0;
    const pageSize = 250;
    while (true) {
      const page = await this.getData({ offset, limit: pageSize });
      for (const item of page.items) yield item;
      if (page.items.length < pageSize) break;
      offset += page.items.length;
    }
  }

  async drop(): Promise<void> {
    if (!this.client) {
      const p = this._localPath();
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true });
      return;
    }
    await this.client.delete(`/api/storage/datasets/${this.datasetId}`);
  }

  // ── Local helpers ────────────────────────────────────────────────────────

  private _localPath(): string {
    return path.join(config.localStorageDir, 'datasets', this.datasetId);
  }

  private _localPush(items: T[]): void {
    const dir = this._localPath();
    fs.mkdirSync(dir, { recursive: true });
    const existing = fs.readdirSync(dir).length;
    items.forEach((item, i) => {
      const idx = String(existing + i).padStart(9, '0');
      fs.writeFileSync(path.join(dir, `${idx}.json`), JSON.stringify(item, null, 2));
    });
  }

  private _localGet(offset: number, limit: number): DatasetContent {
    const dir = this._localPath();
    if (!fs.existsSync(dir)) return { items: [], total: 0, offset, limit, count: 0 };
    const files = fs.readdirSync(dir).sort();
    const total = files.length;
    const sliced = files.slice(offset, offset + limit);
    const items = sliced.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')));
    return { items, total, offset, limit, count: items.length };
  }
}
