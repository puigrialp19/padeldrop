import express from 'express';
import path from 'node:path';
import { config } from './config.js';
import { sql } from './db/db.js';
import { loadUser, requireAdminApi, requireAdminPage, purgeExpiredSessions } from './middleware/auth.js';
import { publicHeaders, adminHeaders, noStore, sameOrigin, apiLimiter } from './middleware/security.js';
import { authRouter } from './routes/auth.js';
import { metricsRouter } from './routes/metrics.js';
import { customersRouter } from './routes/customers.js';
import { ordersRouter } from './routes/orders.js';
import { stripeRouter } from './routes/stripe-webhook.js';
import { initOrderExtras } from './services/stripe-sync.js';
import { pushRouter } from './routes/push.js';
import { initPush } from './services/push.js';
import { visitRouter, liveRouter } from './routes/live.js';
import { initLive } from './services/live.js';

// Comprobar la base de datos antes de aceptar visitas.
try {
  const [{ n }] = await sql`SELECT count(*) AS n FROM packs`;
  if (!n) console.warn('  Aviso: la tabla "packs" está vacía. Ejecuta el SQL de server/db/schema.sql.');
} catch (err) {
  console.error(`\n  No se puede usar la base de datos: ${err.message}`);
  console.error('  - ¿Es correcta DATABASE_URL?  - ¿Has creado las tablas? (npm run db:init o el SQL en Supabase)\n');
  process.exit(1);
}
// Avisos al móvil: crea sus tablas y claves la primera vez. Si falla, la web funciona igual (sin avisos).
try { await initPush(); } catch (err) { console.error('  Avisos push no disponibles:', err.message); }
// Visitantes en directo (anónimo): crea su tabla de recuentos la primera vez.
try { await initLive(); } catch (err) { console.error('  Contador de visitas no disponible:', err.message); }
// Recogida en club: añade sus columnas si aún no existen (los pedidos las necesitan).
await initOrderExtras();
purgeExpiredSessions();
setInterval(purgeExpiredSessions, 60 * 60 * 1000).unref();

const app = express();
app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', config.trustProxy);

// Comprobación de salud para el hosting (no expone datos).
app.get('/healthz', async (req, res) => {
  try { await sql`SELECT 1`; res.json({ ok: true }); } catch { res.status(503).json({ ok: false }); }
});

// Dominio propio: la dirección antigua de Render redirige (301) a PUBLIC_URL conservando la ruta y el ?ref de los QR ya
// impresos. Solo GET/HEAD: el webhook de Stripe (POST) sigue llegando aunque apunte a la dirección antigua.
const publicHost = new URL(config.publicUrl).hostname;
app.use((req, res, next) => {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || req.hostname === publicHost || !req.hostname.endsWith('.onrender.com')) return next();
  if (req.path === '/admin/sw.js') return next(); // la app del panel ya instalada sigue actualizándose
  res.redirect(301, config.publicUrl + req.originalUrl);
});

// 1) Webhook de Stripe: necesita el cuerpo sin procesar, por eso va antes de express.json().
app.use('/api/stripe', stripeRouter);

// 1b) Señales anónimas de visita desde la web pública (antes de la zona de administración).
app.use('/api/visit', noStore, visitRouter);

// 2) API del panel (JSON, solo administradores).
app.use('/api', adminHeaders, noStore, apiLimiter, express.json({ limit: '20kb' }), loadUser, sameOrigin);
app.use('/api/auth', authRouter);
app.use('/api/admin', requireAdminApi);
app.use('/api/admin/metrics', metricsRouter);
app.use('/api/admin/customers', customersRouter);
app.use('/api/admin/orders', ordersRouter);
app.use('/api/admin/push', pushRouter);
app.use('/api/admin/live', liveRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// 3) Panel /admin. El login y su CSS son públicos; todo lo demás exige sesión de administrador.
const adminDir = config.paths.admin;
app.use('/admin', adminHeaders, noStore, loadUser);
app.get('/admin/login', (req, res) => {
  if (req.user) return res.redirect(302, '/admin');
  res.sendFile(path.join(adminDir, 'login.html'));
});
app.use('/admin/css', express.static(path.join(adminDir, 'css')));
app.get('/admin/js/login.js', (req, res) => res.sendFile(path.join(adminDir, 'js', 'login.js')));
// Archivos de la app instalable (PWA): el móvil los lee antes de iniciar sesión. No contienen datos.
app.use('/admin/icons', express.static(path.join(adminDir, 'icons')));
app.get('/admin/manifest.webmanifest', (req, res) => res.type('application/manifest+json').sendFile(path.join(adminDir, 'manifest.webmanifest')));
app.get('/admin/sw.js', (req, res) => res.type('text/javascript').sendFile(path.join(adminDir, 'sw.js')));
app.get('/admin/offline.html', (req, res) => res.sendFile(path.join(adminDir, 'offline.html')));
app.use('/admin', requireAdminPage, express.static(adminDir, { index: 'index.html', extensions: ['html'] }));

// 4) Web pública (la de siempre).
app.use(publicHeaders, express.static(config.paths.public, { extensions: ['html'] }));

app.use((req, res) => res.status(404).sendFile(path.join(config.paths.public, 'index.html')));

app.use((err, req, res, _next) => {
  console.error(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON no válido.' });
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(config.port, () => {
  console.log(`\n  PADEL DROP funcionando en ${config.publicUrl}\n  Panel de administración: ${config.publicUrl}/admin\n`);
});
