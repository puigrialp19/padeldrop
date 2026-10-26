import { api } from '../api.js';
import { esc, eur, botes, date, monthName, packBadge, statusBadge, SUB_STATUS, ORDER_STATUS, userAddress, loading, errorBox, toast } from '../ui.js';

const field = (label, value) => `<div><dt class="label">${esc(label)}</dt><dd class="text-sm">${value || '<span class="text-muted">—</span>'}</dd></div>`;

export async function renderCustomerDetail(view, { args: [id], isStale }) {
  view.innerHTML = `<a href="#/clientes" class="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">← Volver a clientes</a>${loading()}`;
  let d;
  try { d = await api.customer(id); } catch (err) { if (!isStale()) view.querySelector('.card').outerHTML = errorBox(err.message); return; }
  if (isStale()) return;

  const c = d.customer, s = d.subscription;
  const fullName = `${c.first_name} ${c.last_name}`.trim() || c.email;
  const addr = userAddress(c);

  view.querySelector('.card').outerHTML = `
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="font-display text-3xl font-extrabold uppercase tracking-wide sm:text-4xl">${esc(fullName)}</h1>
        <p class="mt-1 text-sm text-muted">Cliente desde ${date(c.created_at)}${c.stripe_customer_id ? ` · Stripe ${esc(c.stripe_customer_id)}` : ''}</p>
      </div>
      <div>${statusBadge(SUB_STATUS, s?.status)}</div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section class="card p-5">
        <h2 class="mb-4 font-semibold">Contacto</h2>
        <dl class="grid gap-4">
          ${field('Nombre', esc(c.first_name))}
          ${field('Apellidos', esc(c.last_name))}
          ${field('Teléfono', c.phone ? `<a class="underline" href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a>` : '')}
          ${field('Email', `<a class="break-all underline" href="mailto:${esc(c.email)}">${esc(c.email)}</a>`)}
        </dl>
      </section>

      <section class="card p-5">
        <div class="mb-4 flex items-center justify-between"><h2 class="font-semibold">Dirección de envío</h2><button class="btn-ghost px-3 py-1 text-xs" id="copy" type="button">Copiar</button></div>
        <dl class="grid grid-cols-2 gap-4">
          <div class="col-span-2">${field('Calle', esc(c.street))}</div>
          ${field('Número', esc(c.street_number))}
          ${field('Piso / puerta', esc(c.floor_door))}
          ${field('Código postal', esc(c.postal_code))}
          ${field('Ciudad', esc(c.city))}
          ${field('Provincia', esc(c.province))}
          ${field('País', esc(c.country === 'ES' ? 'España' : c.country))}
        </dl>
      </section>

      <section class="card p-5">
        <h2 class="mb-4 font-semibold">Suscripción</h2>
        ${s ? `
          <div class="mb-4">${packBadge(s.pack_slug, s.pack_name)}</div>
          <dl class="grid grid-cols-2 gap-4">
            ${field('Contenido', `${botes(s.cans)} + ${s.grips} grips`)}
            ${field('Cuota', `${eur(s.price_cents)}/mes`)}
            ${field('Alta', date(s.started_at))}
            ${s.status === 'canceled' ? field('Cancelada', date(s.canceled_at)) : field('Próxima renovación', `<strong>${date(s.current_period_end)}</strong>`)}
            ${s.status === 'paused' ? field('Pausada desde', date(s.paused_at)) : ''}
          </dl>
          ${d.subscriptions.length > 1 ? `<p class="mt-4 text-xs text-muted">Ha tenido ${d.subscriptions.length} suscripciones.</p>` : ''}`
        : '<p class="text-sm text-muted">Sin suscripción.</p>'}
      </section>
    </div>

    <section class="card mt-4 overflow-hidden">
      <h2 class="border-b border-line p-5 font-semibold">Historial de pedidos <span class="text-sm font-normal text-muted">(${d.orders.length})</span></h2>
      ${d.orders.length ? `
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-line"><tr><th class="th">Mes</th><th class="th">Pack</th><th class="th text-right">Importe</th><th class="th">Estado</th><th class="th">Seguimiento</th></tr></thead>
          <tbody>${d.orders.map((o) => `
            <tr class="border-b border-line last:border-0">
              <td class="td whitespace-nowrap">${esc(monthName(o.period, 'long', true))}</td>
              <td class="td whitespace-nowrap">${esc(o.pack_name)}</td>
              <td class="td text-right num whitespace-nowrap">${eur(o.amount_cents + o.shipping_cents)}</td>
              <td class="td">${statusBadge(ORDER_STATUS, o.status, true)}</td>
              <td class="td num">${o.tracking_number ? `${esc(o.tracking_number)}<div class="text-xs text-muted">${esc(o.carrier)}</div>` : '<span class="text-muted">—</span>'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<p class="p-5 text-sm text-muted">Todavía no hay pedidos.</p>'}
    </section>`;

  view.querySelector('#copy').addEventListener('click', async () => {
    const text = [fullName, ...addr, c.phone].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(text); toast('Dirección copiada.'); } catch { toast('No se ha podido copiar. Selecciona el texto a mano.', true); }
  });
}
