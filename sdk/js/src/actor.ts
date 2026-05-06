/**
 * Actor — JS/TS main entry point for the Scrapi SDK.
 *
 * Usage:
 *   import { Actor } from 'scrapi-sdk';
 *   
 *   await Actor.init();
 *   const input = await Actor.getInput();
 *   const queue = await Actor.openRequestQueue();
 *   await queue.addRequest({ url: 'https://example.com', uniqueKey: 'https://example.com' });
 *   
 *   while (!await queue.isFinished()) {
 *     const req = await queue.fetchNextRequest();
 *     if (!req) { await sleep(500); continue; }
 *     await Actor.pushData({ url: req.url });
 *     await queue.markRequestAsHandled(req);
 *   }
 *   await Actor.exit();
 */
import { config } from './config';
import { ScrapiClient } from './client/scrapi_client';
import { KeyValueStore } from './storages/key_value_store';
import { RequestQueue } from './storages/request_queue';
import { Dataset } from './storages/dataset';
import { createRequest, type Request } from './models';
import { AsyncLocalStorage } from 'async_hooks';

// ── Shared Log Context (Phase 8) ───────────────────────────────────────────────
const logContext = new AsyncLocalStorage<(message: string) => void | Promise<void>>();

export class ScrapiLog {
  async info(message: string): Promise<void> {
    const cb = logContext.getStore();
    if (cb) await cb(message);
    console.log(`[INFO] ${message}`);
  }

  async error(message: string): Promise<void> {
    const cb = logContext.getStore();
    if (cb) await cb(`❌ ERROR: ${message}`);
    console.error(`[ERROR] ${message}`);
  }

  async warning(message: string): Promise<void> {
    const cb = logContext.getStore();
    if (cb) await cb(`⚠️ WARNING: ${message}`);
    console.warn(`[WARN] ${message}`);
  }

  async success(message: string): Promise<void> {
    const cb = logContext.getStore();
    if (cb) await cb(`✅ SUCCESS: ${message}`);
    console.log(`[SUCCESS] ${message}`);
  }
}


// ── Shared client singleton ────────────────────────────────────────────────────

let _client: ScrapiClient | null = null;
function getClient(forceCloud = false): ScrapiClient | null {
  if (config.isAtHome || forceCloud) {
    if (!_client) _client = new ScrapiClient();
    return _client;
  }
  return null;
}

// ── Actor class ───────────────────────────────────────────────────────────────

export class Actor {
  private static _initialized = false;
  private static _defaultKvStore: KeyValueStore | null = null;
  private static _defaultDataset: Dataset | null = null;
  private static _defaultRq: RequestQueue | null = null;

  /**
   * SDK Logger (Phase 8)
   */
  public static log = new ScrapiLog();


  // ── Lifecycle ─────────────────────────────────────────────────────────────

  static async init(): Promise<void> {
    if (Actor._initialized) return;
    Actor._initialized = true;
    const mode = config.isAtHome ? 'remote (platform)' : 'local (filesystem)';
    console.log(`[Scrapi] Actor initialized [${mode}]`);
  }

  static async exit(options?: { exitCode?: number }): Promise<void> {
    _client = null;
    Actor._initialized = false;
    Actor._defaultKvStore = null;
    Actor._defaultDataset = null;
    Actor._defaultRq = null;
    console.log(`[Scrapi] Actor exited (exitCode=${options?.exitCode ?? 0})`);
  }

  /**
   * Internal use: set the callback for real-time log streaming.
   * Links Actor.log calls to the platform's run stream.
   */
  static setLogCallback(callback: (message: string) => void | Promise<void>, fn: () => Promise<void>): Promise<void> {
    return logContext.run(callback, fn);
  }


  // ── Input / Output shortcuts ───────────────────────────────────────────────

  static async getInput<T = Record<string, unknown>>(): Promise<T | null> {
    const store = await Actor._ensureDefaultKvStore();
    return store.getValue<T>('INPUT');
  }

  static async getValue<T = unknown>(key: string): Promise<T | null> {
    const store = await Actor._ensureDefaultKvStore();
    return store.getValue<T>(key);
  }

  static async setValue(key: string, value: unknown, options?: { contentType?: string }): Promise<void> {
    const store = await Actor._ensureDefaultKvStore();
    await store.setValue(key, value, options);
  }

  static async pushData(data: Record<string, unknown> | Record<string, unknown>[]): Promise<void> {
    const dataset = await Actor._ensureDefaultDataset();
    await dataset.pushData(Array.isArray(data) ? data : [data]);
  }

  // ── Storage openers ───────────────────────────────────────────────────────

  static async openKeyValueStore(
    nameOrId?: string,
    options?: { forceCloud?: boolean }
  ): Promise<KeyValueStore> {
    const client = getClient(options?.forceCloud);

    if (!nameOrId) return Actor._ensureDefaultKvStore(options?.forceCloud);

    // Looks like a UUID → treat as ID
    if (/^[0-9a-f-]{36}$/i.test(nameOrId)) return new KeyValueStore(nameOrId, client);

    // Named store
    if (client) {
      const result = await client.post<any>('/api/storage/kv-stores', { name: nameOrId });
      return new KeyValueStore(result.id, client);
    }
    return new KeyValueStore(nameOrId, null);
  }

  static async openRequestQueue(
    nameOrId?: string,
    options?: { forceCloud?: boolean }
  ): Promise<RequestQueue> {
    const client = getClient(options?.forceCloud);

    if (!nameOrId) return Actor._ensureDefaultRq(options?.forceCloud);

    if (/^[0-9a-f-]{36}$/i.test(nameOrId)) return new RequestQueue(nameOrId, client);

    if (client) {
      const result = await client.post<any>('/api/storage/request-queues', { name: nameOrId });
      return new RequestQueue(result.id, client);
    }
    return new RequestQueue(nameOrId, null);
  }

  static async openDataset<T extends Record<string, unknown> = Record<string, unknown>>(
    nameOrId?: string,
    options?: { forceCloud?: boolean }
  ): Promise<Dataset<T>> {
    const client = getClient(options?.forceCloud);

    if (!nameOrId) return Actor._ensureDefaultDataset(options?.forceCloud) as Promise<Dataset<T>>;

    if (/^[0-9a-f-]{36}$/i.test(nameOrId)) return new Dataset<T>(nameOrId, client);

    if (client) {
      const result = await client.post<any>('/api/storage/datasets', { name: nameOrId });
      return new Dataset<T>(result.id, client);
    }
    return new Dataset<T>(nameOrId, null);
  }

  // ── Internal default store management ─────────────────────────────────────

  private static async _ensureDefaultKvStore(forceCloud = false): Promise<KeyValueStore> {
    if (Actor._defaultKvStore) return Actor._defaultKvStore;
    const client = getClient(forceCloud);
    let storeId = config.defaultKvStoreId;
    if (!storeId) {
      if (client) {
        const r = await client.post<any>('/api/storage/kv-stores', {});
        storeId = r.id;
      } else {
        storeId = 'default';
      }
    }
    Actor._defaultKvStore = new KeyValueStore(storeId!, client);
    return Actor._defaultKvStore;
  }

  private static async _ensureDefaultDataset(forceCloud = false): Promise<Dataset> {
    if (Actor._defaultDataset) return Actor._defaultDataset;
    const client = getClient(forceCloud);
    let id = config.defaultDatasetId;
    if (!id) {
      if (client) {
        const r = await client.post<any>('/api/storage/datasets', {});
        id = r.id;
      } else {
        id = 'default';
      }
    }
    Actor._defaultDataset = new Dataset(id!, client);
    return Actor._defaultDataset;
  }

  private static async _ensureDefaultRq(forceCloud = false): Promise<RequestQueue> {
    if (Actor._defaultRq) return Actor._defaultRq;
    const client = getClient(forceCloud);
    let id = config.defaultRqId;
    if (!id) {
      if (client) {
        const r = await client.post<any>('/api/storage/request-queues', {});
        id = r.id;
      } else {
        id = 'default';
      }
    }
    Actor._defaultRq = new RequestQueue(id!, client);
    return Actor._defaultRq;
  }
}
