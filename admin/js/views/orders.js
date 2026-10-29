import { api } from '../api.js';
import { setQuery } from '../app.js';
import { esc, int, eur, botes, date, monthName, currentMonth, packBadge, statusBadge, ORDER_STATUS, orderAddress, pageHeader, monthInput, loading, errorBox, toast, debounce } from '../ui.js';

const TABS = [['', 'Todos'], ['pending', 'Pendientes'], ['shipped', 'Enviados'], ['delivered', 'Entregados']];
const PACK_OPTIONS = [['', 'Todos los packs'], ['start', 'Pack Básico'], ['player', 'Pack Intermedio'], ['pro', 'Pack Premium']];
const CARRIERS = ['Correos Express', 'SEUR', 'MRW', 'GLS', 'Nacex', 'Correos'];

const statusSelect = (o) => `<label class="sr-only" for="st-${o.id}">Estado del envío</label>
  <select class="input" id="st-${o.id}" data-field="status">${Object.entries(ORDER_STATUS).map(([v, s]) => `<option value="${v}" ${v === o.status ? 'selected' : ''}>${s.label}</option>`).join('')}</select>`;

function orderCard(o) {
  const addr = orderAddress(o);
  return `
  <article class="card p-4 sm:p-5" data-id="${o.id}">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <a href="#/clientes/${o.user_id}" class="font-semibold hover:underline">${esc(o.ship_name)}</a>
        <p class="truncate text-sm text-muted">${esc(o.email)}${o.ship_phone ? ` · <a class="underline" href="tel:${esc(o.ship_phone.replace(/\s/g, ''))}">${esc(o.ship_phone)}</a>` : ''}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">${o.refunded_cents ? `<span class="rounded-full bg-critical/10 px-2.5 py-1 text-xs font-semibold text-critical">Reembolsado ${eur(o.refunded_cents)}</span>` : ''}<span data-badge>${statusBadge(ORDER_STATUS, o.status, true)}</span>${packBadge(o.pack_slug, o.pack_name)}</div>
    </div>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      ${o.delivery === 'club' ? `<div class="rounded-xl border-2 border-lime bg-soft p-3 text-sm">
        <p class="label mb-0.5">Recogida en club · sin envío</p>
        <p class="font-semibold">${esc(o.pickup_club || 'Club pendiente de confirmar')}</p>
        <p class="mt-1 text-xs text-muted">Llévala al club y márcala como «Entregado» cuando la recoja.</p>
      </div>` : `<div class="rounded-xl ${o.delivery === 'office' ? 'border-2 border-line' : ''} bg-soft p-3 text-sm">
        <p class="label mb-0.5">${o.delivery === 'office' ? 'Envío a oficina de Correos o CityPaq' : 'Envío a domicilio'}</p>
        ${o.delivery === 'office' ? `<p class="mb-1 font-semibold">${o.pickup_office ? `Recoge en: ${esc(o.pickup_office)}` : 'La oficina o CityPaq más cercano a:'}</p>` : ''}
        ${addr.map((l) => `<div>${esc(l)}</div>`).join('') || '<span class="text-critical">Sin dirección</span>'}
      </div>`}
      <div class="rounded-xl bg-soft p-3 text-sm">
        <p class="label mb-0.5">Preparar</p>
        <p class="font-semibold">${botes(o.cans)} + ${o.grips} grips</p>
        <p class="mt-1 text-xs text-muted">PD-${o.id} · cobrado ${eur(o.amount_cents + o.shipping_cents)} el ${date(o.paid_at)}${o.shipped_at ? ` · enviado ${date(o.shipped_at)}` : ''}${o.delivered_at ? ` · entregado ${date(o.delivered_at)}` : ''}${o.refunded_at ? ` · reembolsado ${date(o.refunded_at)}` : ''}</p>
        <button type="button" class="mt-1 text-xs font-semibold text-muted underline hover:text-ink" data-refund="${o.refunded_cents ? 'false' : 'true'}">${o.refunded_cents ? 'Deshacer reembolso' : 'Marcar como reembolsado'}</button>
      </div>
    </div>
    <form class="mt-3 grid gap-2 sm:grid-cols-[1.2fr_1fr_1.3fr_auto]" data-form>
      ${statusSelect(o)}
      <label class="sr-only" for="ca-${o.id}">Transportista</label>
      <input class="input" id="ca-${o.id}" data-field="carrier" list="carriers" placeholder="Transportista" value="${esc(o.carrier)}" maxlength="40">
      <label class="sr-only" for="tr-${o.id}">Número de seguimiento</label>
      <input class="input num" id="tr-${o.id}" data-field="tracking_number" placeholder="Nº de seguimiento" value="${esc(o.tracking_number)}" maxlength="60" autocomplete="off">
      <button class="btn-primary" type="submit">Guardar</button>
    </form>
  </article>`;
}

export async function renderOrders(view, { params, isStale }) {
  const state = {
    month: /^\d{4}-\d{2}$/.test(params.month || '') ? params.month : currentMonth(),
    status: params.status === 'all' ? '' : params.status || 'pending', q: params.q || '', pack: params.pack || '',
  };

  view.innerHTML = `
    ${pageHeader('Pedidos y envíos', 'Prepara, envía y registra el seguimiento de cada caja mensual.',
      `${monthInput('month', state.month)}<a class="btn-ghost" id="export" href="#" download>
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3"/></svg>Exportar CSV (Excel)</a>
      <a class="btn-primary" id="packlink" href="#" download title="Pedidos pendientes a domicilio y a oficina/CityPaq, para Packlink PRO → Nuevo envío → Importar CSV">
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10"/></svg>Exportar para Packlink</a>`)}
    <section class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4" id="summary" aria-label="Resumen del mes"></section>
    <div class="card mb-4 flex flex-col gap-3 p-3 xl:flex-row xl:items-center">
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Estado del envío" id="tabs"></div>
      <div class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
        <label class="sr-only" for="q">Buscar pedidos</label>
        <input class="input min-w-0 sm:flex-1" id="q" type="search" placeholder="Nombre, email, ciudad, CP, club, oficina o seguimiento" value="${esc(state.q)}" autocomplete="off">
        <label class="sr-only" for="pack">Pack</label>
        <select class="input sm:w-48" id="pack">${PACK_OPTIONS.map(([v, l]) => `<option value="${v}" ${v === state.pack ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
    </div>
    <datalist id="carriers">${CARRIERS.map((c) => `<option value="${c}">`).join('')}</datalist>
    <div id="list">${loading()}</div>`;

  const list = view.querySelector('#list');
  let orders = [];

  async function load() {
    setQuery({ month: state.month === currentMonth() ? '' : state.month, status: state.status === 'pending' ? '' : state.status || 'all', q: state.q, pack: state.pack });
    view.querySelector('#export').href = api.exportUrl({ month: state.month, status: state.status, pack: state.pack, q: state.q });
    view.querySelector('#packlink').href = api.packlinkUrl({ month: state.month, pack: state.pack, q: state.q });
    let data;
    try { data = await api.orders(state); } catch (err) { list.innerHTML = errorBox(err.message); return; }
    if (isStale()) return;
    orders = data.orders;

    const sm = data.summary, get = (k, f = 'n') => sm[k]?.[f] || 0;
    const allN = get('pending') + get('shipped') + get('delivered');
    view.querySelector('#summary').innerHTML = [
      ['Pendientes de preparar', int(get('pending')), `de ${int(allN)} pedidos de ${monthName(state.month)}`],
      ['Material por preparar', `${int(get('pending', 'cans'))} <span class="text-base font-normal text-muted">botes</span>`, `${int(get('pending', 'grips'))} grips`],
      ['Enviados', int(get('shipped')), 'en camino'],
      ['Entregados', int(get('delivered')), 'confirmados'],
    ].map(([l, v, f]) => `<div class="card p-4"><p class="text-xs font-semibold uppercase tracking-wide text-muted">${l}</p><p class="mt-1 text-2xl font-semibold num">${v}</p><p class="text-xs text-muted">${f}</p></div>`).join('');

    view.querySelector('#tabs').innerHTML = TABS.map(([v, l]) => {
      const on = v === state.status;
      const n = v ? get(v) : allN;
      return `<button type="button" data-status="${v}" aria-pressed="${on}" class="rounded-full border px-3 py-1.5 text-sm font-semibold transition ${on ? 'border-lime bg-lime text-black' : 'border-line bg-card text-ink hover:bg-soft'}">${l} <span class="num ${on ? '' : 'text-muted'}">${int(n)}</span></button>`;
    }).join('');

    list.innerHTML = orders.length
      ? `<p class="mb-3 text-sm text-muted">${int(orders.length)} pedidos</p><div class="grid gap-3 xl:grid-cols-2">${orders.map(orderCard).join('')}</div>`
      : `<div class="card p-8 text-center text-sm text-muted">${state.status === 'pending' && allN ? '¡Todo enviado! No quedan pedidos pendientes este mes.' : 'No hay pedidos con estos filtros.'}</div>`;
  }

  view.querySelector('#month').addEventListener('change', (e) => { if (e.target.value) { state.month = e.target.value; load(); } });
  view.querySelector('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-status]');
    if (b) { state.status = b.dataset.status; load(); }
  });
  view.querySelector('#q').addEventListener('input', debounce((e) => { state.q = e.target.value.trim(); load(); }));
  view.querySelector('#pack').addEventListener('change', (e) => { state.pack = e.target.value; load(); });

  // Al escribir un nº de seguimiento en un pedido pendiente, se propone el estado "Enviado".
  list.addEventListener('input', (e) => {
    if (e.target.dataset.field !== 'tracking_number' || !e.target.value.trim()) return;
    const sel = e.target.form.querySelector('[data-field="status"]');
    if (sel.value === 'pending') sel.value = 'shipped';
  });

  // Los reembolsos hechos en Stripe se marcan solos; este botón es para los hechos antes o fuera de Stripe.
  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-refund]');
    if (!b) return;
    const refunded = b.dataset.refund === 'true';
    if (refunded && !confirm('¿Marcar este pedido como reembolsado? Dejará de contar en los ingresos.')) return;
    b.disabled = true;
    try {
      await api.updateOrder(Number(b.closest('[data-id]').dataset.id), { refunded });
      toast(refunded ? 'Pedido marcado como reembolsado: ya no cuenta en los ingresos.' : 'Reembolso deshecho.');
      load();
    } catch (err) {
      toast(err.message, true);
      b.disabled = false;
    }
  });

  list.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const card = form.closest('[data-id]');
    const id = Number(card.dataset.id);
    const patch = Object.fromEntries([...form.querySelectorAll('[data-field]')].map((i) => [i.dataset.field, i.value.trim()]));
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      const { order } = await api.updateOrder(id, patch);
      const idx = orders.findIndex((o) => o.id === id);
      orders[idx] = order;
      card.querySelector('[data-badge]').innerHTML = statusBadge(ORDER_STATUS, order.status, true);
      toast(`Pedido de ${order.ship_name}: ${ORDER_STATUS[order.status].label.toLowerCase()}.`);
      // Recarga contadores sin perder la posición; el pedido sale de la vista si ya no cumple el filtro.
      if (state.status && order.status !== state.status) { card.classList.add('opacity-40'); setTimeout(load, 600); }
      else load();
    } catch (err) {
      toast(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  await load();
}
