// Utilidades de interfaz compartidas por todas las vistas.

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// useGrouping 'always': en es-ES Intl no separa miles en números de 4 cifras ("2451") si no se fuerza.
const eurFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
const eur0Fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
const intFmt = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });
export const eur = (cents) => eurFmt.format((cents || 0) / 100);
export const eur0 = (cents) => eur0Fmt.format((cents || 0) / 100);
export const pct = (x, digits = 1) => `${((x || 0) * 100).toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;
export const int = (n) => intFmt.format(n || 0);
export const botes = (n) => (n === 1 ? '1 bote' : `${int(n)} botes`);

export const date = (iso) => (iso ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const monthName = (ym, style = 'long', capital = false) => {
  const [y, m] = ym.split('-').map(Number);
  const s = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('es-ES', { month: style, year: style === 'long' ? 'numeric' : '2-digit', timeZone: 'UTC' });
  return capital ? s.charAt(0).toUpperCase() + s.slice(1) : s;
};
export const currentMonth = () => new Date().toISOString().slice(0, 7);

export const PACK_CLASS = {
  start: { bg: 'bg-pack-start', fill: 'fill-pack-start', text: 'text-pack-start' },
  player: { bg: 'bg-pack-player', fill: 'fill-pack-player', text: 'text-pack-player' },
  pro: { bg: 'bg-pack-pro', fill: 'fill-pack-pro', text: 'text-pack-pro' },
};

export const packBadge = (slug, name) =>
  `<span class="badge border border-line bg-card text-ink"><span class="size-2 rounded-full ${PACK_CLASS[slug]?.bg || 'bg-muted'}" aria-hidden="true"></span>${esc(name || 'Sin pack')}</span>`;

// Estados: siempre icono + texto, nunca solo color.
const ICON = {
  check: '<path d="M5 12l4 4 10-10"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  box: '<path d="M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>',
};
const icon = (name) => `<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">${ICON[name]}</svg>`;

export const SUB_STATUS = {
  active: { label: 'Activa', cls: 'bg-good/15 text-[#006300] dark:text-good', icon: 'check' },
  paused: { label: 'Pausada', cls: 'bg-warning/20 text-[#7a5200] dark:text-warning', icon: 'pause' },
  canceled: { label: 'Cancelada', cls: 'bg-critical/12 text-critical', icon: 'x' },
};
export const ORDER_STATUS = {
  pending: { label: 'Pendiente de preparar', short: 'Pendiente', cls: 'bg-warning/20 text-[#7a5200] dark:text-warning', icon: 'box' },
  shipped: { label: 'Enviado', short: 'Enviado', cls: 'bg-pack-start/15 text-pack-start', icon: 'truck' },
  delivered: { label: 'Entregado', short: 'Entregado', cls: 'bg-good/15 text-[#006300] dark:text-good', icon: 'check' },
};
export const statusBadge = (map, key, short = false) => {
  const s = map[key];
  if (!s) return '<span class="badge bg-soft text-muted">Sin suscripción</span>';
  return `<span class="badge ${s.cls}">${icon(s.icon)}${esc(short && s.short ? s.short : s.label)}</span>`;
};

function addressLines({ street, number, floor, cp, city, province, country }) {
  return [
    [[street, number].filter(Boolean).join(', '), floor].filter(Boolean).join(' · '),
    [cp, city].filter(Boolean).join(' '),
    [province, country === 'ES' ? 'España' : country].filter(Boolean).join(', '),
  ].filter(Boolean);
}
export const userAddress = (u) => addressLines({ street: u.street, number: u.street_number, floor: u.floor_door, cp: u.postal_code, city: u.city, province: u.province, country: u.country });
export const orderAddress = (o) => addressLines({ street: o.ship_street, number: o.ship_number, floor: o.ship_floor_door, cp: o.ship_postal_code, city: o.ship_city, province: o.ship_province, country: o.ship_country });

let toastTimer;
export function toast(message, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.toggle('bg-critical', isError);
  el.classList.toggle('bg-black', !isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

export const loading = (text = 'Cargando…') => `<div class="card p-8 text-center text-sm text-muted">${esc(text)}</div>`;
export const errorBox = (msg) => `<div class="card border-critical/40 p-6 text-sm text-critical" role="alert">${esc(msg)}</div>`;

/** La CSP del panel prohíbe style="…" en el HTML: los anchos se aplican por JS tras pintar. */
export function applyWidths(root) {
  root.querySelectorAll('[data-w]').forEach((el) => { el.style.width = `${Math.max(0, Math.min(100, Number(el.dataset.w)))}%`; });
}

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export const pageHeader = (title, subtitle = '', actions = '') => `
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div><h1 class="font-display text-3xl font-extrabold uppercase tracking-wide sm:text-4xl">${esc(title)}</h1>${subtitle ? `<p class="mt-1 text-sm text-muted">${subtitle}</p>` : ''}</div>
    ${actions ? `<div class="flex flex-wrap items-center gap-2">${actions}</div>` : ''}
  </div>`;

export const monthInput = (id, value) =>
  `<label class="sr-only" for="${id}">Mes</label><input class="input w-auto" type="month" id="${id}" value="${esc(value)}" max="${currentMonth()}" min="2025-01">`;
