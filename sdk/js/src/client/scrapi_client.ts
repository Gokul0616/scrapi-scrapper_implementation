/**
 * ScrapiClient — fetch-based HTTP client for the Scrapi REST API.
 */
import { config } from '../config';

export class ScrapiClient {
  private baseUrl: string;
  private token: string | undefined;

  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = (baseUrl ?? config.baseUrl).replace(/\/$/, '');
    this.token = token ?? config.token;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.buildUrl(path, params), {
      method: 'GET',
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async getRaw(path: string): Promise<{ data: ArrayBuffer; contentType: string }> {
    const res = await fetch(this.buildUrl(path), {
      method: 'GET',
      headers: this.headers({ 'Content-Type': '' }),
    });
    if (!res.ok) {
      if (res.status === 404) throw Object.assign(new Error('Not found'), { status: 404 });
      throw new Error(`GET ${path} failed: ${res.status}`);
    }
    const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
    const data = await res.arrayBuffer();
    return { data, contentType };
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.buildUrl(path), {
      method: 'POST',
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async putRaw(path: string, data: ArrayBuffer | Uint8Array | string, contentType: string): Promise<unknown> {
    const body = typeof data === 'string' ? data : data;
    const res = await fetch(this.buildUrl(path), {
      method: 'PUT',
      headers: this.headers({ 'Content-Type': contentType }),
      body: body as BodyInit,
    });
    if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async delete<T = unknown>(path: string): Promise<T> {
    const res = await fetch(this.buildUrl(path), {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }
}
