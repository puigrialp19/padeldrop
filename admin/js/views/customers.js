import { api } from '../api.js';
import { setQuery } from '../app.js';
import { esc, int, date, packBadge, statusBadge, SUB_STATUS, pageHeader, loading, errorBox, debounce } from '../ui.js';

const PACK_OPTIONS = [['', 'Todos los packs'], ['start', 'Pack Básico'], ['player', 'Pack Intermedio'], ['pro', 'Pack Premium']];
const STATUS_TABS = [['', 'Todos'], ['active', 'Activas'], ['paused', 'Pausadas'], ['canceled', 'Canceladas']];

export async function renderCustomers(view, { params, isStale }) {
  const state = { q: params.q || '', status: params.status || '', pack: params.pack || '', page: Number(params.page) || 1 };

  view.innerHTML = `
    ${pageHeader('Clientes', 'Busca por nombre, email, teléfono, ciudad o código postal.')}
    <div class="card mb-4 flex flex-col gap-3 p-3 xl:flex-row xl:items-center">
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Estado de la suscripción" id="tabs"></div>
      <div class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
        <label class="sr-only" for="q">Buscar clientes</label>
        <input class="input min-w-0 sm:flex-1" id="q" type="search" placeholder="Buscar…" value="${esc(state.q)}" autocomplete="off">
        <label class="sr-only" for="pack">Pack</label>
        <select class="input sm:w-48" id="pack">${PACK_OPTIONS.map(([v, l]) => `<option value="${v}" ${v === state.pack ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
    </div>
    <div id="results">${loading()}</div>`;

  const results = view.querySelector('#results');

  async function load() {
    setQuery({ q: state.q, status: state.status, pack: state.pack, page: state.page > 1 ? state.page : '' });
    let data;
    try { data = await api.customers(state); } catch (err) { results.innerHTML = errorBox(err.message); return; }
    if (isStale()) return;

    const total = Object.values(data.counts).reduce((a, b) => a + b, 0);
    view.querySelector('#tabs').innerHTML = STATUS_TABS.map(([v, l]) => {
      const n = v ? data.counts[v] || 0 : total;
      const on = v === state.status;
      return `<button type="button" data-status="${v}" aria-pressed="${on}" class="rounded-full border px-3 py-1.5 text-sm font-semibold transition ${on ? 'border-lime bg-lime text-black' : 'border-line bg-card text-ink hover:bg-soft'}">${l} <span class="num ${on ? '' : 'text-muted'}">${int(n)}</span></button>`;
    }).join('');

    if (!data.customers.length) { results.innerHTML = '<div class="card p-8 text-center text-sm text-muted">No hay clientes con estos filtros.</div>'; return; }

    const pages = Math.ceil(data.total / data.pageSize);
    const link = (c) => `#/clientes/${c.id}`;
    const name = (c) => esc(`${c.first_name} ${c.last_name}`.trim() || c.email);
    results.innerHTML = `
      <!-- Móvil: tarjetas -->
      <ul class="flex flex-col gap-2 md:hidden">
        ${data.customers.map((c) => `
          <li><a href="${link(c)}" class="card block p-4 hover:border-muted">
            <div class="flex items-start justify-between gap-2"><span class="font-semibold">${name(c)}</span>${statusBadge(SUB_STATUS, c.status)}</div>
            <p class="mt-1 truncate text-sm text-muted">${esc(c.email)}</p>
            <div class="mt-3 flex items-center justify-between gap-2 text-sm">${packBadge(c.pack_slug, c.pack_name)}<span class="text-xs text-muted">${c.status === 'canceled' ? '' : `Renueva ${date(c.current_period_end)}`}</span></div>
          </a></li>`).join('')}
      </ul>
      <!-- Escritorio: tabla -->
      <div class="card hidden overflow-x-auto md:block">
        <table class="w-full text-sm">
          <thead class="border-b border-line"><tr><th class="th">Cliente</th><th class="th">Contacto</th><th class="th hidden xl:table-cell">Ciudad</th><th class="th">Pack</th><th class="th">Estado</th><th class="th">Próx. cobro</th></tr></thead>
          <tbody>
            ${data.customers.map((c) => `
              <tr class="cursor-pointer border-b border-line last:border-0 hover:bg-soft" data-href="${link(c)}">
                <td class="td font-medium whitespace-nowrap"><a href="${link(c)}" class="hover:underline">${name(c)}</a></td>
                <td class="td text-muted"><div class="max-w-56 truncate">${esc(c.email)}</div><div class="num whitespace-nowrap">${esc(c.phone)}</div></td>
                <td class="td hidden xl:table-cell">${esc(c.city)}<div class="text-xs text-muted">${esc(c.province)}</div></td>
                <td class="td">${packBadge(c.pack_slug, c.pack_name)}</td>
                <td class="td">${statusBadge(SUB_STATUS, c.status)}</td>
                <td class="td num whitespace-nowrap">${c.status === 'canceled' ? '<span class="text-muted">—</span>' : date(c.current_period_end)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <nav class="mt-4 flex items-center justify-between gap-3 text-sm" aria-label="Paginación">
        <span class="text-muted">${int(data.total)} clientes · página ${data.page} de ${pages}</span>
        <div class="flex gap-2">
          <button class="btn-ghost" data-page="${data.page - 1}" ${data.page <= 1 ? 'disabled' : ''}>Anterior</button>
          <button class="btn-ghost" data-page="${data.page + 1}" ${data.page >= pages ? 'disabled' : ''}>Siguiente</button>
        </div>
      </nav>`;
  }

  view.querySelector('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-status]');
    if (b) { state.status = b.dataset.status; state.page = 1; load(); }
  });
  view.querySelector('#q').addEventListener('input', debounce((e) => { state.q = e.target.value.trim(); state.page = 1; load(); }));
  view.querySelector('#pack').addEventListener('change', (e) => { state.pack = e.target.value; state.page = 1; load(); });
  results.addEventListener('click', (e) => {
    const p = e.target.closest('[data-page]');
    if (p && !p.disabled) { state.page = Number(p.dataset.page); load(); view.scrollIntoView(); return; }
    const row = e.target.closest('tr[data-href]');
    if (row && !e.target.closest('a')) location.hash = row.dataset.href;
  });

  await load();
}
