import { api } from '../api.js';
import { esc, int, pageHeader, loading, errorBox, applyWidths } from '../ui.js';

const PAGE = { inicio: 'Portada', privacidad: 'Privacidad', cookies: 'Cookies', condiciones: 'Condiciones', 'aviso-legal': 'Aviso legal' };
const STAGE = {
  web: { label: 'Navegando', cls: 'bg-soft text-ink', icon: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>' },
  planes: { label: 'Viendo los planes', cls: 'bg-pack-start/15 text-pack-start', icon: '<path d="M4 6h16M4 12h16M4 18h10"/>' },
  cesta: { label: 'Cesta abierta', cls: 'bg-warning/20 text-[#7a5200] dark:text-warning', icon: '<path d="M6 6h15l-1.5 9h-12zM6 6L5 3H2m7 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>' },
  pago: { label: 'Ha ido a pagar', cls: 'bg-good/15 text-[#006300] dark:text-good', icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>' },
};
const DEVICE = {
  'móvil': '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  tablet: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 18h2"/>',
  ordenador: '<rect x="2" y="4" width="20" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
};
const svg = (paths, cls = 'size-4') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${paths}</svg>`;

export function sourceLabel(s) {
  const known = { directo: 'Directo o enlace', tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', google: 'Google', x: 'X (Twitter)', youtube: 'YouTube' };
  if (known[s]) return known[s];
  if (s.startsWith('qr-')) return `QR · ${s.slice(3).replace(/-/g, ' ')}`;
  return s;
}
const ago = (sec) => (sec < 60 ? `${sec} s` : sec < 3600 ? `${Math.floor(sec / 60)} min` : `${Math.floor(sec / 3600)} h ${Math.floor((sec % 3600) / 60)} min`);

function sourceBars(rows, total) {
  if (!rows.length) return '<p class="text-sm text-muted">Todavía no hay visitas.</p>';
  return `<ul class="space-y-3">${rows.map((r) => `
    <li>
      <div class="mb-1 flex justify-between gap-3 text-sm"><span>${esc(sourceLabel(r.source))}</span><span class="num font-semibold">${int(r.visits)}</span></div>
      <div class="h-2 overflow-hidden rounded-full bg-soft"><div class="h-full rounded-full bg-ink" data-w="${(r.visits / (total || 1)) * 100}"></div></div>
    </li>`).join('')}</ul>`;
}

export async function renderLive(view, { isStale }) {
  view.innerHTML = pageHeader('En directo', 'Personas en tu web ahora mismo. Se actualiza solo cada 5 segundos.') + `<div id="live">${loading()}</div>`;
  const box = view.querySelector('#live');

  async function tick() {
    if (isStale()) return; // has cambiado de pantalla: se deja de consultar
    let d;
    try { d = await api.live(); } catch (err) { if (!isStale()) box.innerHTML = errorBox(err.message); return; }
    if (isStale()) return;
    const byStage = Object.fromEntries(Object.keys(STAGE).map((k) => [k, d.visitors.filter((v) => v.stage === k).length]));
    box.innerHTML = `
      <section class="card flex items-center gap-4 p-5 sm:p-6">
        <span class="relative flex size-4 shrink-0" aria-hidden="true">
          ${d.count ? '<span class="absolute inline-flex size-full animate-ping rounded-full bg-good opacity-60"></span>' : ''}
          <span class="relative inline-flex size-4 rounded-full ${d.count ? 'bg-good' : 'bg-muted/40'}"></span>
        </span>
        <div>
          <p class="text-4xl font-semibold num">${int(d.count)}</p>
          <p class="text-sm text-muted">${d.count === 1 ? 'persona en la web ahora' : 'personas en la web ahora'}</p>
        </div>
      </section>

      <section class="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="En qué punto están">
        ${Object.entries(STAGE).map(([k, s]) => `
          <div class="card p-4"><p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">${svg(s.icon, 'size-3.5')}${s.label}</p>
          <p class="mt-1 text-2xl font-semibold num">${int(byStage[k])}</p></div>`).join('')}
      </section>

      <h2 class="mt-6 mb-3 text-lg font-semibold">Quién está ahora</h2>
      ${d.visitors.length ? `<ul class="grid grid-cols-1 gap-2 md:grid-cols-2">${d.visitors.map((v) => `
        <li class="card flex min-w-0 items-center gap-3 p-4">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-soft text-ink" title="${esc(v.device)}">${svg(DEVICE[v.device] || DEVICE.ordenador, 'size-5')}</span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2"><span class="badge ${STAGE[v.stage].cls}">${svg(STAGE[v.stage].icon, 'size-3.5')}${STAGE[v.stage].label}</span></div>
            <p class="mt-1 truncate text-sm text-muted">Viendo <b class="text-ink">${esc(PAGE[v.page] || v.page)}</b> · desde <b class="text-ink">${esc(sourceLabel(v.source))}</b> · ${esc(v.device)}</p>
          </div>
          <span class="shrink-0 text-xs text-muted num">${ago(v.seconds)}</span>
        </li>`).join('')}</ul>`
        : '<div class="card p-8 text-center text-sm text-muted">Ahora mismo no hay nadie en la web. En cuanto entre alguien, aparecerá aquí.</div>'}

      <section class="mt-6 grid gap-3 lg:grid-cols-2">
        <div class="card p-5"><h2 class="mb-4 font-semibold">Visitas de hoy <span class="font-normal text-muted">(${int(d.today.total)})</span></h2>${sourceBars(d.today.bySource, d.today.total)}</div>
        <div class="card p-5"><h2 class="mb-4 font-semibold">Últimos 7 días <span class="font-normal text-muted">(${int(d.week.total)})</span></h2>${sourceBars(d.week.bySource, d.week.total)}</div>
      </section>
      <p class="mt-4 text-xs text-muted">Recuento anónimo y sin cookies: no se guarda la IP ni nada en el dispositivo del visitante. Tus propias visitas no cuentan si tienes el panel abierto en ese navegador.</p>`;
    applyWidths(box);
    const badge = document.getElementById('live-badge');
    if (badge) { badge.textContent = d.count; badge.hidden = !d.count; }
    setTimeout(tick, 5000);
  }
  await tick();
}
