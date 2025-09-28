const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';

import { premiumRequired } from '@/upsell';

export async function api(path: string, opts: RequestInit = {}, token?: string) {
  const headers = new Headers(opts.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = isJson ? body?.message || 'Request failed' : String(body);
    const err = new Error(msg) as any;
    err.status = res.status;
    try {
      if (res.status === 403 && typeof body?.message === 'string' && body.message.toLowerCase().includes('premium')) {
        premiumRequired({});
      }
    } catch {}
    throw err;
  }
  return body;
}

export async function apiWithEtag(path: string, opts: RequestInit = {}, token?: string): Promise<{ data: any; etag?: string; res: Response }> {
  const headers = new Headers(opts.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) throw new Error(isJson ? data?.message || 'Request failed' : String(data));
  const etag = res.headers.get('etag') || undefined;
  return { data, etag, res };
}
