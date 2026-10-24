// Notificaciones push al móvil de los administradores (app instalable del panel).
// La primera vez que arranca crea sus tablas y genera sus claves (VAPID) en la base de datos:
// no hace falta configurar nada en el hosting. La clave privada nunca sale del servidor.
import webpush from 'web-push';
import { sql } from '../db/db.js';
import { config } from '../config.js';

let vapid = null;
// En las pruebas automáticas se sustituye el envío real por una función falsa.
let sender = (sub, payload, opts) => webpush.sendNotification(sub, payload, opts);
export const __setSender = (fn) => { sender = fn; };

export async function initPush() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id     bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint    text        NOT NULL UNIQUE,
      p256dh      text        NOT NULL,
      auth        text        NOT NULL,
      user_agent  text        NOT NULL DEFAULT '',
      created_at  timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key    text PRIMARY KEY,
      value  text NOT NULL
    );
    ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;`);

  const rows = await sql`SELECT key, value FROM app_settings WHERE key IN ('vapid_public', 'vapid_private')`;
  let pub = rows.find((r) => r.key === 'vapid_public')?.value;
  let priv = rows.find((r) => r.key === 'vapid_private')?.value;
  if (!pub || !priv) {
    const keys = webpush.generateVAPIDKeys();
    // ON CONFLICT DO NOTHING: si dos arranques coinciden, gana el primero y se relee.
    await sql`INSERT INTO app_settings (key, value) VALUES ('vapid_public', ${keys.publicKey}), ('vapid_private', ${keys.privateKey})
      ON CONFLICT (key) DO NOTHING`;
    const again = await sql`SELECT key, value FROM app_settings WHERE key IN ('vapid_public', 'vapid_private')`;
    pub = again.find((r) => r.key === 'vapid_public').value;
    priv = again.find((r) => r.key === 'vapid_private').value;
  }
  vapid = { publicKey: pub, privateKey: priv, subject: 'mailto:padeldropp@gmail.com' };
}

export const publicKey = () => vapid?.publicKey || '';

export async function saveSubscription(userId, sub, userAgent = '') {
  const endpoint = String(sub?.endpoint || '');
  const p256dh = String(sub?.keys?.p256dh || '');
  const auth = String(sub?.keys?.auth || '');
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) {
    throw Object.assign(new Error('Suscripción no válida.'), { status: 400 });
  }
  await sql`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
    VALUES (${userId}, ${endpoint}, ${p256dh}, ${auth}, ${String(userAgent).slice(0, 300)})
    ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`;
}

export async function removeSubscription(userId, endpoint) {
  await sql`DELETE FROM push_subscriptions WHERE user_id = ${userId} AND endpoint = ${String(endpoint || '')}`;
}

export async function countSubscriptions(userId) {
  const [{ n }] = await sql`SELECT count(*) AS n FROM push_subscriptions WHERE user_id = ${userId}`;
  return n;
}

/**
 * Envía una notificación a los móviles de los administradores (a todos, o solo a userId).
 * Nunca lanza errores: un fallo de avisos no debe romper un pedido.
 */
export async function notifyAdmins({ title, body, url = '/admin/#/pedidos', tag = 'pd' }, userId = null) {
  if (!vapid) return { sent: 0, failed: 0 };
  let sent = 0, failed = 0;
  try {
    const subs = userId
      ? await sql`SELECT * FROM push_subscriptions WHERE user_id = ${userId}`
      : await sql`SELECT ps.* FROM push_subscriptions ps JOIN users u ON u.id = ps.user_id WHERE u.role = 'ADMIN'`;
    const payload = JSON.stringify({ title, body, url, tag });
    await Promise.all(subs.map(async (s) => {
      try {
        await sender({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          vapidDetails: vapid, TTL: 60 * 60 * 24, urgency: 'high',
        });
        sent++;
      } catch (err) {
        failed++;
        // 404/410: el móvil ya no existe o se desactivaron los avisos -> se olvida esa suscripción
        if (err?.statusCode === 404 || err?.statusCode === 410) await sql`DELETE FROM push_subscriptions WHERE id = ${s.id}`;
        else console.error('[push]', err?.statusCode || '', err?.body || err?.message);
      }
    }));
  } catch (err) {
    console.error('[push]', err.message);
  }
  if (!config.isProd && (sent || failed)) console.log(`[push] "${title}": ${sent} enviados, ${failed} fallidos`);
  return { sent, failed };
}
