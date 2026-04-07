/**
 * config.ts — reads Scrapi environment variables.
 *
 * Environment variables used by the Scrapi SDK
 * ─────────────────────────────────────────────────
 * SCRAPI_TOKEN        →  SCRAPI_TOKEN
 * SCRAPI_API_BASE_URL →  SCRAPI_BASE_URL
 * SCRAPI_LOCAL_STORAGE_DIR → SCRAPI_LOCAL_STORAGE_DIR
 * SCRAPI_ACTOR_RUN_ID →  SCRAPI_RUN_ID
 */

const env = (key: string, fallback = ''): string =>
  (typeof process !== 'undefined' && process.env[key]) || fallback;

export interface ScrapiConfig {
  token: string | undefined;
  baseUrl: string;
  localStorageDir: string;
  runId: string | undefined;
  defaultKvStoreId: string | undefined;
  defaultDatasetId: string | undefined;
  defaultRqId: string | undefined;
  readonly isAtHome: boolean;
  readonly isLocal: boolean;
}

const _overrides: Record<string, string | undefined> = {};

export const config: ScrapiConfig = {
  get token() { return _overrides.token || env('SCRAPI_TOKEN') || undefined; },
  set token(v: string | undefined) { _overrides.token = v; },

  get baseUrl() { return _overrides.baseUrl || (env('SCRAPI_BASE_URL', 'https://api.scrapi.io')).replace(/\/$/, ''); },
  set baseUrl(v: string) { _overrides.baseUrl = v; },

  get localStorageDir() { return _overrides.localStorageDir || env('SCRAPI_LOCAL_STORAGE_DIR', './storage'); },
  set localStorageDir(v: string) { _overrides.localStorageDir = v; },

  get runId() { return _overrides.runId || env('SCRAPI_RUN_ID') || undefined; },
  set runId(v: string | undefined) { _overrides.runId = v; },

  get defaultKvStoreId() { return _overrides.defaultKvStoreId || env('SCRAPI_DEFAULT_KV_STORE_ID') || undefined; },
  set defaultKvStoreId(v: string | undefined) { _overrides.defaultKvStoreId = v; },

  get defaultDatasetId() { return _overrides.defaultDatasetId || env('SCRAPI_DEFAULT_DATASET_ID') || undefined; },
  set defaultDatasetId(v: string | undefined) { _overrides.defaultDatasetId = v; },

  get defaultRqId() { return _overrides.defaultRqId || env('SCRAPI_DEFAULT_REQUEST_QUEUE_ID') || undefined; },
  set defaultRqId(v: string | undefined) { _overrides.defaultRqId = v; },

  get isAtHome() {
    return Boolean(this.token);
  },
  get isLocal() {
    return !this.isAtHome;
  },
};
