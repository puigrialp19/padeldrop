// Avisos de pedidos nuevos en este dispositivo (notificaciones push).
import { api } from './api.js';
import { toast } from './ui.js';

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// La clave pública VAPID viene en base64url; PushManager la quiere en bytes.
function keyBytes(b64url) {
  const b64 = (b64url + '='.repeat((4 - (b64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export function initPush() {
  const btn = document.getElementById('push-toggle');
  const label = document.getElementById('push-label');
  const testBtn = document.getElementById('push-test');
  if (!btn) return;

  function paint(state) {
    // state: on | off | denied | unsupported | ios-install
    const text = {
      on: 'Avisos de pedidos: activados',
      off: 'Activar avisos de pedidos',
      denied: 'Avisos bloqueados en el navegador',
      unsupported: 'Avisos no disponibles aquí',
      'ios-install': 'Avisos: instala la app primero',
    }[state];
    label.textContent = text;
    btn.dataset.state = state;
    btn.setAttribute('aria-pressed', state === 'on' ? 'true' : 'false');
    testBtn.hidden = state !== 'on';
  }

  async function refresh() {
    if (isIos() && !isStandalone()) return paint('ios-install');
    if (!supported()) return paint('unsupported');
    if (Notification.permission === 'denied') return paint('denied');
    const sub = await currentSubscription().catch(() => null);
    paint(sub && Notification.permission === 'granted' ? 'on' : 'off');
  }

  async function enable() {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      paint(permission === 'denied' ? 'denied' : 'off');
      return toast('Sin permiso no podemos avisarte. Puedes activarlo en los ajustes del navegador.', true);
    }
    const { publicKey } = await api.pushInfo();
    if (!publicKey) return toast('Los avisos no están disponibles en el servidor.', true);
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
    await api.pushSubscribe(sub.toJSON());
    paint('on');
    toast('Avisos activados en este dispositivo.');
  }

  async function disable() {
    const sub = await currentSubscription();
    if (sub) {
      await api.pushUnsubscribe(sub.endpoint).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    paint('off');
    toast('Avisos desactivados en este dispositivo.');
  }

  btn.addEventListener('click', async () => {
    const state = btn.dataset.state;
    try {
      if (state === 'off') await enable();
      else if (state === 'on') { if (confirm('¿Desactivar los avisos de pedidos en este dispositivo?')) await disable(); }
      else if (state === 'denied') toast('Has bloqueado los avisos. Actívalos en los ajustes del navegador para esta web y vuelve a pulsar.', true);
      else if (state === 'ios-install') toast('En iPhone: Compartir → «Añadir a pantalla de inicio», abre la app desde el icono y activa los avisos ahí.', true);
      else toast('Este navegador no admite avisos. Usa Chrome en Android o la app instalada en iPhone.', true);
    } catch (err) {
      toast(`No se han podido activar los avisos: ${err.message}`, true);
      refresh();
    }
  });

  testBtn.addEventListener('click', async () => {
    testBtn.disabled = true;
    try { await api.pushTest(); toast('Notificación de prueba enviada.'); } catch (err) { toast(err.message, true); } finally { testBtn.disabled = false; }
  });

  refresh();
}
