/**
 * RequestQueue — JS/TS storage class.
 *
 * Remote mode: calls /api/storage/request-queues/{id}/...
 * Local mode: each request stored as JSON file in
 *   {SCRAPI_LOCAL_STORAGE_DIR}/request_queues/{queueId}/{sha256_of_unique_key}.json
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import type { ScrapiClient } from '../client/scrapi_client';
import type { Request, RequestOperationInfo } from '../models';
import { createRequest } from '../models';

export class RequestQueue {
  constructor(
    private readonly queueId: string,
    private readonly client: ScrapiClient | null = null,
  ) {}

  get id(): string { return this.queueId; }

  async addRequest(
    request: Partial<Request> & { url: string },
    options?: { forefront?: boolean }
  ): Promise<RequestOperationInfo> {
    const req = this._normalize(request, options?.forefront ?? false);
    if (!this.client) return this._localAdd(req);
    const result = await this.client.post<any>(
      `/api/storage/request-queues/${this.queueId}/requests`,
      { requests: [req] }
    );
    return {
      wasAlreadyPresent: (result.duplicate ?? 0) > 0,
      wasAlreadyHandled: false,
      requestId: req.uniqueKey,
    };
  }

  async addRequests(
    requests: Array<Partial<Request> & { url: string }>,
    options?: { waitForAllRequestsToBeAdded?: boolean }
  ): Promise<void> {
    const normalized = requests.map(r => this._normalize(r));
    if (!this.client) { normalized.forEach(r => this._localAdd(r)); return; }
    await this.client.post(`/api/storage/request-queues/${this.queueId}/requests`, { requests: normalized });
  }

  async fetchNextRequest(): Promise<Request | null> {
    if (!this.client) return this._localFetchNext();
    const result = await this.client.get<any>(
      `/api/storage/request-queues/${this.queueId}/head`,
      { limit: 1, lockSecs: 60 }
    );
    const items = result.items ?? [];
    if (items.length === 0) return null;
    return this._mapRequest(items[0]);
  }

  private _mapRequest(raw: any): Request {
    return {
      ...raw,
      uniqueKey: raw.unique_key || raw.uniqueKey,
      retryCount: raw.retry_count ?? raw.retryCount,
      handledAt: raw.handled_at ?? raw.handledAt,
      userData: raw.user_data ?? raw.userData,
      noRetry: raw.no_retry ?? raw.noRetry,
      loadedUrl: raw.loaded_url ?? raw.loadedUrl,
    };
  }

  async getRequest(requestId: string): Promise<Request | null> {
    if (!this.client) return this._localGet(requestId);
    try {
      return await this.client.get<Request>(
        `/api/storage/request-queues/${this.queueId}/requests/${requestId}`
      );
    } catch (e: any) {
      if (e?.status === 404) return null;
      throw e;
    }
  }

  async markRequestAsHandled(request: Request): Promise<Request | null> {
    const uk = request.uniqueKey ?? request.url;
    if (!this.client) return this._localMarkHandled(uk);
    const result = await this.client.post<any>(
      `/api/storage/request-queues/${this.queueId}/requests/${uk}/mark-handled`
    );
    return result.request ?? null;
  }

  async reclaimRequest(request: Request, options?: { forefront?: boolean }): Promise<Request | null> {
    const uk = request.uniqueKey ?? request.url;
    if (!this.client) return this._localReclaim(uk);
    const result = await this.client.post<any>(
      `/api/storage/request-queues/${this.queueId}/requests/${uk}/reclaim`,
      { forefront: options?.forefront ?? false }
    );
    return result.request ?? null;
  }

  async isFinished(): Promise<boolean> {
    if (!this.client) return this._localIsFinished();
    const result = await this.client.get<any>(
      `/api/storage/request-queues/${this.queueId}/is-finished`
    );
    return result.isFinished ?? false;
  }

  async getInfo(): Promise<Record<string, unknown>> {
    if (!this.client) return this._localStats();
    return this.client.get(`/api/storage/request-queues/${this.queueId}`);
  }

  async drop(): Promise<void> {
    if (!this.client) {
      const p = this._localPath();
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true });
      return;
    }
    await this.client.delete(`/api/storage/request-queues/${this.queueId}`);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private _normalize(req: Partial<Request> & { url: string }, forefront = false): Request {
    const created = createRequest(req.url, req);
    return { ...created, forefront } as Request & { forefront: boolean };
  }

  // ── Local helpers ────────────────────────────────────────────────────────

  private _localPath(): string {
    return path.join(config.localStorageDir, 'request_queues', this.queueId);
  }

  private _localFile(uk: string): string {
    const hash = crypto.createHash('sha256').update(uk).digest('hex').slice(0, 16);
    return path.join(this._localPath(), `${hash}.json`);
  }

  private _localAdd(req: Request): RequestOperationInfo {
    const dir = this._localPath();
    fs.mkdirSync(dir, { recursive: true });
    const f = this._localFile(req.uniqueKey);
    if (fs.existsSync(f)) {
      return { wasAlreadyPresent: true, wasAlreadyHandled: false, requestId: req.uniqueKey };
    }
    fs.writeFileSync(f, JSON.stringify({ ...req, status: 'pending', retryCount: 0 }, null, 2));
    return { wasAlreadyPresent: false, wasAlreadyHandled: false, requestId: req.uniqueKey };
  }

  private _localFetchNext(): Request | null {
    const dir = this._localPath();
    if (!fs.existsSync(dir)) return null;
    for (const f of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, f);
      const data = JSON.parse(fs.readFileSync(full, 'utf-8'));
      if (data.status === 'pending') {
        data.status = 'locked';
        fs.writeFileSync(full, JSON.stringify(data, null, 2));
        return data as Request;
      }
    }
    return null;
  }

  private _localGet(uk: string): Request | null {
    const f = this._localFile(uk);
    if (!fs.existsSync(f)) return null;
    return JSON.parse(fs.readFileSync(f, 'utf-8')) as Request;
  }

  private _localMarkHandled(uk: string): Request | null {
    const f = this._localFile(uk);
    if (!fs.existsSync(f)) return null;
    const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    data.status = 'handled';
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    return data as Request;
  }

  private _localReclaim(uk: string): Request | null {
    const f = this._localFile(uk);
    if (!fs.existsSync(f)) return null;
    const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    data.status = 'pending';
    data.retryCount = (data.retryCount ?? 0) + 1;
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    return data as Request;
  }

  private _localIsFinished(): boolean {
    const dir = this._localPath();
    if (!fs.existsSync(dir)) return true;
    for (const f of fs.readdirSync(dir)) {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
      if (data.status === 'pending' || data.status === 'locked') return false;
    }
    return true;
  }

  private _localStats(): Record<string, unknown> {
    const dir = this._localPath();
    let total = 0; let handled = 0; let pending = 0;
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
        total++;
        if (data.status === 'handled') handled++;
        else if (data.status === 'pending') pending++;
      }
    }
    return { total_request_count: total, handled_request_count: handled, pending_request_count: pending };
  }
}
