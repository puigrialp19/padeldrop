import { api } from '../api.js';
import { esc, int, pageHeader, loading, errorBox, applyWidths } from '../ui.js';

const PACK = { start: 'START', player: 'PLAYER', pro: 'PRO' };
const RESULT = { ia: 'La respondió la IA', sin_respuesta: 'Sin respuesta: se ofreció contacto' };

function bars(rows, label) {
  const total = rows.reduce((a, r) => a + r.n, 0);
  if (!rows.length) return '<p class="text-sm text-muted">Todavía no hay datos.</p>';
  return `<ul class="space-y-3">${rows.map((r) => `
    <li>
      <div class="mb-1 flex justify-between gap-3 text-sm"><span>${esc(label(r.key))}</span><span class="num font-semibold">${int(r.n)}</span></div>
      <div class="h-2 overflow-hidden rounded-full bg-soft"><div class="h-full rounded-full bg-ink" data-w="${(r.n / (total || 1)) * 100}"></div></div>
    </li>`).join('')}</ul>`;
}

export async function renderChat(view, { params, isStale }) {
  const days = ['7', '30', '90'].includes(params.days) ? Number(params.days) : 30;
  view.innerHTML = pageHeader('Asistente', 'Cómo usan el chat de la web tus visitantes. Datos anónimos.') + `<div id="chat-stats">${loading()}</div>`;
  const box = view.querySelector('#chat-stats');
  let d;
  try { d = await api.chat(days); } catch (err) { if (!isStale()) box.innerHTML = errorBox(err.message); return; }
  if (isStale()) return;

  const sum = (metric) => d.rows.filter((r) => r.metric === metric).reduce((a, r) => a + r.n, 0);
  const of = (metric) => d.rows.filter((r) => r.metric === metric);
  const kpis = [
    ['Conversaciones', sum('conversation')],
    ['Mensajes', sum('message')],
    ['Clics en un pack', sum('pack_click')],
    [d.whatsapp ? 'Clics en WhatsApp' : 'Clics para contactar', sum('wa_click') + sum('email_click')],
  ];
  const src = Object.fromEntries(of('source').map((r) => [r.key, r.n]));
  const answered = (src.motor || 0) + (src.ia || 0), totalSrc = answered + (src.sin_respuesta || 0);
  const topics = of('topic').filter((r) => !['saludo', 'gracias', 'adios'].includes(r.key));

  box.innerHTML = `
    <div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Periodo">
      ${[7, 30, 90].map((n) => `<button type="button" class="btn ${n === days ? 'btn-primary' : 'btn-ghost'}" data-days="${n}">${n} días</button>`).join('')}
    </div>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen">
      ${kpis.map(([l, v]) => `<div class="card p-4"><p class="text-xs font-semibold uppercase tracking-wide text-muted">${l}</p><p class="mt-1 text-2xl font-semibold num">${int(v)}</p></div>`).join('')}
    </section>

    <section class="mt-3 grid gap-3 lg:grid-cols-2">
      <div class="card p-5"><h2 class="mb-4 font-semibold">Temas más preguntados</h2>${bars(topics, (k) => d.topicLabels[k] || k)}</div>
      <div class="card p-5"><h2 class="mb-4 font-semibold">Packs más consultados</h2>${bars(of('pack_shown'), (k) => PACK[k] || k)}
        <h3 class="mb-3 mt-6 text-sm font-semibold">Packs recomendados por el asistente</h3>${bars(of('recommended'), (k) => PACK[k] || k)}
        <h3 class="mb-3 mt-6 text-sm font-semibold">Clics en «Elegir pack»</h3>${bars(of('pack_click'), (k) => PACK[k] || k)}</div>
    </section>

    <section class="mt-3 grid gap-3 lg:grid-cols-2">
      <div class="card p-5"><h2 class="mb-2 font-semibold">Respuestas</h2>
        <p class="text-sm text-muted">${totalSrc ? `${int(Math.round((answered / totalSrc) * 100))} % de las preguntas respondidas` : 'Todavía no hay preguntas.'}</p>
        <ul class="mt-3 space-y-1 text-sm">
          <li class="flex justify-between"><span>Motor propio</span><span class="num font-semibold">${int(src.motor || 0)}</span></li>
          <li class="flex justify-between"><span>IA gratuita</span><span class="num font-semibold">${int(src.ia || 0)}</span></li>
          <li class="flex justify-between"><span>Sin respuesta (se ofreció contacto)</span><span class="num font-semibold">${int(src.sin_respuesta || 0)}</span></li>
          <li class="flex justify-between"><span>Veces que sugirió hablar con una persona</span><span class="num font-semibold">${int(sum('wa_suggested'))}</span></li>
          <li class="flex justify-between"><span>Veces que se abrió el chat</span><span class="num font-semibold">${int(sum('open'))}</span></li>
        </ul>
        <p class="mt-4 text-xs text-muted">IA gratuita: ${d.ai.enabled ? `activa (${esc(d.ai.model)}). Hoy ha usado ${int(d.ai.neuronsToday)} de ${int(d.ai.dailyLimit)} neuronas; al llegar al tope deja de usarse hasta el día siguiente y el chat sigue con el motor propio.` : 'no configurada. El chat responde solo con el motor propio.'}
        ${d.whatsapp ? '' : '<br>WhatsApp: sin número. El chat ofrece el correo; pon el número en <code>public/js/config.js</code> (whatsapp).'}</p>
      </div>
      <div class="card p-5"><h2 class="mb-1 font-semibold">Preguntas que el motor no reconoció</h2>
        <p class="mb-3 text-xs text-muted">Sirven para detectar dudas que frenan la compra y mejorar las respuestas (content/asistente.mjs). Se guardan sin correos ni teléfonos y se borran a los 90 días.</p>
        ${d.questions.length ? `<ul class="divide-y divide-line text-sm">${d.questions.map((q) => `
          <li class="py-2"><p>${esc(q.question)}</p><p class="mt-0.5 text-xs text-muted">${esc(new Date(q.day).toLocaleDateString('es-ES'))} · ${esc(RESULT[q.result] || q.result)}</p></li>`).join('')}</ul>`
          : '<p class="text-sm text-muted">Ninguna todavía.</p>'}
      </div>
    </section>
    <p class="mt-4 text-xs text-muted">Recuento anónimo: no se guarda la IP ni nada que identifique al visitante. Tus propias pruebas no cuentan si tienes el panel abierto en ese navegador.</p>`;
  applyWidths(box);
  box.querySelectorAll('[data-days]').forEach((b) => b.addEventListener('click', () => { history.replaceState(null, '', `#/asistente?days=${b.dataset.days}`); renderChat(view, { params: { days: b.dataset.days }, isStale }); }));
}
