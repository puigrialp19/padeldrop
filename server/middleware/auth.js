import { createHash, randomBytes } from 'node:crypto';
import { sql } from '../db/db.js';
import { config } from '../config.js';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const sessionMs = () => config.sessionHours * 3600 * 1000;

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

const cookieOptions = () => ({
  httpOnly: true,               // JavaScript del navegador no puede leerla
  secure: config.isProd,        // solo HTTPS en producción
  sameSite: 'strict',           // no se envía desde otras webs (protección CSRF)
  path: '/',
  maxAge: sessionMs(),
});

export async function createSession(req, res, userId) {
  const token = randomBytes(32).toString('base64url');
  await sql`INSERT INTO sessions (token_hash, user_id, expires_at, ip, user_agent)
    VALUES (${sha256(token)}, ${userId}, ${new Date(Date.now() + sessionMs())}, ${req.ip || ''},
            ${String(req.headers['user-agent'] || '').slice(0, 300)})`;
  res.cookie(config.cookieName, token, cookieOptions());
}

export async function destroySession(req, res) {
  const token = readCookie(req, config.cookieName);
  if (token) await sql`DELETE FROM sessions WHERE token_hash = ${sha256(token)}`;
  res.clearCookie(config.cookieName, { ...cookieOptions(), maxAge: undefined });
}

/** Carga req.user si la cookie de sesión es válida. Renueva la caducidad (sesión deslizante). */
export async function loadUser(req, res, next) {
  try {
    const token = readCookie(req, config.cookieName);
    if (!token) return next();
    const [row] = await sql`
      SELECT s.token_hash, s.expires_at, u.id, u.email, u.role, u.first_name, u.last_name
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ${sha256(token)}`;
    if (!row || row.expires_at <= new Date() || row.role !== 'ADMIN') {
      if (row) await sql`DELETE FROM sessions WHERE token_hash = ${row.token_hash}`;
      return next();
    }
    // Renovar como mucho una vez cada 10 minutos para no escribir en cada petición.
    const remaining = row.expires_at.getTime() - Date.now();
    if (sessionMs() - remaining > 10 * 60 * 1000) {
      await sql`UPDATE sessions SET expires_at = ${new Date(Date.now() + sessionMs())} WHERE token_hash = ${row.token_hash}`;
      res.cookie(config.cookieName, token, cookieOptions());
    }
    req.user = { id: row.id, email: row.email, role: row.role, name: `${row.first_name} ${row.last_name}`.trim() };
    next();
  } catch (err) {
    next(err);
  }
}

/** Para la API: 401 si no hay sesión, 403 si no es ADMIN. */
export function requireAdminApi(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'No has iniciado sesión.' });
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acceso restringido a administradores.' });
  next();
}

/** Para las páginas del panel: redirige al login si no hay sesión de administrador. */
export function requireAdminPage(req, res, next) {
  if (req.user?.role === 'ADMIN') return next();
  res.redirect(302, '/admin/login');
}

export async function purgeExpiredSessions() {
  try { await sql`DELETE FROM sessions WHERE expires_at <= now()`; } catch (err) { console.error('[sessions]', err.message); }
}
