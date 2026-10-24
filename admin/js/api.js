// Cliente de la API del panel. Si la sesión caduca, vuelve al login.
export class ApiError extends Error {}

async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    location.replace('/admin/login');
    throw new ApiError('Sesión caducada.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Error ${res.status}`);
  return data;
}

const qs = (params) => {
  const p = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
  return p.toString() ? `?${p}` : '';
};

export const api = {
  me: () => request('GET', '/api/auth/me'),
  logout: () => request('POST', '/api/auth/logout'),
  metrics: (month) => request('GET', `/api/admin/metrics${qs({ month })}`),
  customers: (params) => request('GET', `/api/admin/customers${qs(params)}`),
  customer: (id) => request('GET', `/api/admin/customers/${encodeURIComponent(id)}`),
  orders: (params) => request('GET', `/api/admin/orders${qs(params)}`),
  updateOrder: (id, patch) => request('PATCH', `/api/admin/orders/${encodeURIComponent(id)}`, patch),
  exportUrl: (params) => `/api/admin/orders/export.csv${qs(params)}`,
  pushInfo: () => request('GET', '/api/admin/push'),
  pushSubscribe: (subscription) => request('POST', '/api/admin/push/subscribe', { subscription }),
  pushUnsubscribe: (endpoint) => request('POST', '/api/admin/push/unsubscribe', { endpoint }),
  pushTest: () => request('POST', '/api/admin/push/test'),
  live: () => request('GET', '/api/admin/live'),
  liveSummary: () => request('GET', '/api/admin/live?summary=1'),
  sourceStats: (source) => request('GET', `/api/admin/live/source/${encodeURIComponent(source)}`),
  qrUrl: (text) => `/api/admin/live/qr.svg${qs({ text })}`,
};
