// Small wrapper around the server API. The token lives in localStorage.
const KEY = 'deepforge-token';

export function token() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setToken(t) {
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* private mode */ }
}

export class ApiError extends Error {
  constructor(msg, status) { super(msg); this.status = status; }
}

async function call(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const t = token();
  if (t) headers.Authorization = 'Bearer ' + t;
  const res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new ApiError((data && data.error) || 'Something went wrong (' + res.status + ').', res.status);
  return data;
}

export const api = {
  get: (p) => call('GET', p),
  post: (p, b) => call('POST', p, b || {}),
  action: (a) => call('POST', '/action', a),
};
