/**
 * models.ts — Request interface and helpers.
 */
import * as crypto from 'crypto';

export interface Request {
  url: string;
  uniqueKey: string;
  method?: string;
  headers?: Record<string, string>;
  payload?: unknown;
  noRetry?: boolean;
  userData?: Record<string, unknown>;
  // Set by platform
  id?: string;
  retryCount?: number;
  loadedUrl?: string;
  handledAt?: string;
  status?: string;
}

export function createRequest(url: string, options: Partial<Request> = {}): Request {
  const uniqueKey = options.uniqueKey ?? crypto.createHash('sha256').update(url).digest('hex');
  return {
    url,
    uniqueKey,
    method: 'GET',
    headers: {},
    payload: undefined,
    noRetry: false,
    userData: {},
    retryCount: 0,
    ...options,
  };
}

export interface RequestOperationInfo {
  wasAlreadyPresent: boolean;
  wasAlreadyHandled: boolean;
  requestId: string;
}

export interface DatasetContent<T = Record<string, unknown>> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  count: number;
}

export interface KeyInfo {
  key: string;
  size: number;
  contentType: string;
}
