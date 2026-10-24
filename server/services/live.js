// Visitantes en directo de la web pública, de forma ANÓNIMA:
// - Cada pestaña abierta envía una señal cada ~15 s con un identificador aleatorio que vive solo en memoria
//   (no se guarda nada en el dispositivo del visitante: ni cookies ni almacenamiento local).
// - Aquí se guardan en memoria los visitantes activos; desaparecen 45 s después de la última señal.
// - En la base de datos solo se guarda un recuento de visitas por día y origen (sin IP ni identificadores).
import { sql } from '../db/db.js';
import { TZ } from './metrics.js';

const ACTIVE_MS = 45_000;
const visitors = new Map();
// Visitas ya contadas en las estadísticas (2 h): volver a la pestaña no cuenta como otra visita
const counted = new Map();
const COUNTED_MS = 2 * 60 * 60 * 1000;
const STAGES = ['web', 'planes', 'cesta', 'pago'];

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const today = () => dayFmt.format(new Date());

export async function initLive() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS visit_stats (
      day     date    NOT NULL,
      source  text    NOT NULL,
      visits  integer NOT NULL DEFAULT 0,
      PRIMARY KEY (day, source)
    );
    ALTER TABLE visit_stats ENABLE ROW LEVEL SECURITY;`);
  setInterval(prune, 10_000).unref();
}

function prune() {
  const limit = Date.now() - ACTIVE_MS;
  for (const [id, v] of visitors) if (v.lastSeen < limit) visitors.delete(id);
  const old = Date.now() - COUNTED_MS;
  for (const [id, t] of counted) if (t < old) counted.delete(id);
}

function deviceOf(ua = '') {
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'móvil';
  return 'ordenador';
}
const clean = (v, max = 40) => String(v || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, max);

/** Registra la señal de un visitante. Devuelve false si se ignora (bots, datos no válidos). */
export async function heartbeat({ id, page, stage, source }, userAgent = '') {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(String(id || ''))) return false;
  if (/bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp\/|curl|wget|python|axios/i.test(userAgent)) return false;
  const now = Date.now();
  const st = STAGES.includes(stage) ? stage : 'web';
  const existing = visitors.get(id);
  if (existing) {
    existing.lastSeen = now;
    existing.page = clean(page, 30) || 'inicio';
    // La etapa solo avanza (si ya fue a pagar, no vuelve a "navegando")
    if (STAGES.indexOf(st) > STAGES.indexOf(existing.stage)) existing.stage = st;
    return true;
  }
  if (visitors.size >= 2000) prune();
  if (visitors.size >= 2000) return false; // protección ante abusos
  const src = clean(source) || 'directo';
  visitors.set(id, { since: now, lastSeen: now, page: clean(page, 30) || 'inicio', stage: st, source: src, device: deviceOf(userAgent) });
  if (counted.has(id)) return true;
  if (counted.size >= 20000) prune();
  counted.set(id, now);
  try {
    await sql`INSERT INTO visit_stats (day, source, visits) VALUES (${today()}, ${src}, 1)
      ON CONFLICT (day, source) DO UPDATE SET visits = visit_stats.visits + 1`;
  } catch (err) { console.error('[live]', err.message); }
  return true;
}

export function leave(id) { visitors.delete(String(id || '')); }

export function liveCount() { prune(); return visitors.size; }

export async function liveSnapshot() {
  prune();
  const now = Date.now();
  const list = [...visitors.values()]
    .sort((a, b) => STAGES.indexOf(b.stage) - STAGES.indexOf(a.stage) || a.since - b.since)
    .map((v) => ({ page: v.page, stage: v.stage, source: v.source, device: v.device, seconds: Math.round((now - v.since) / 1000) }));
  const t = today();
  const [todayRows, weekRows] = await Promise.all([
    sql`SELECT source, visits FROM visit_stats WHERE day = ${t} ORDER BY visits DESC`,
    sql`SELECT source, sum(visits) AS visits FROM visit_stats WHERE day > ${t}::date - 7 GROUP BY source ORDER BY visits DESC`,
  ]);
  return {
    count: list.length,
    visitors: list,
    today: { total: todayRows.reduce((a, r) => a + r.visits, 0), bySource: todayRows },
    week: { total: weekRows.reduce((a, r) => a + r.visits, 0), bySource: weekRows },
  };
}

/** Visitas de un origen concreto (p. ej. el QR de un club): hoy, 7 días y total. */
export async function sourceStats(source) {
  const s = clean(source);
  const [r] = await sql`SELECT
      coalesce(sum(visits) FILTER (WHERE day = ${today()}), 0) AS today,
      coalesce(sum(visits) FILTER (WHERE day > ${today()}::date - 7), 0) AS week,
      coalesce(sum(visits), 0) AS total
    FROM visit_stats WHERE source = ${s}`;
  return r;
}
