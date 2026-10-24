import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import QRCode from 'qrcode';
import { config } from '../config.js';
import { heartbeat, leave, liveSnapshot, liveCount, sourceStats } from '../services/live.js';

// ---- Público: señales de la web (sin cookies ni datos personales) ----
export const visitRouter = Router();

const visitLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });
const hasAdminCookie = (req) => (req.headers.cookie || '').includes(`${config.cookieName}=`);

// Solo se aceptan señales enviadas desde la propia web
function fromOwnSite(req) {
  const origin = req.headers.origin;
  const host = `${req.protocol}://${req.get('host')}`;
  return origin === host || origin === config.publicUrl;
}

visitRouter.use(visitLimiter, express.json({ limit: '2kb' }));

visitRouter.post('/', async (req, res) => {
  // Tú mismo (con la sesión del panel abierta) no cuentas como visitante
  if (!fromOwnSite(req) || hasAdminCookie(req)) return res.status(204).end();
  await heartbeat(req.body || {}, req.headers['user-agent']);
  res.status(204).end();
});

visitRouter.post('/leave', (req, res) => {
  if (fromOwnSite(req)) leave(req.body?.id);
  res.status(204).end();
});

// ---- Panel (solo administradores) ----
export const liveRouter = Router();

liveRouter.get('/', async (req, res, next) => {
  try {
    if (req.query.summary) return res.json({ count: liveCount() });
    res.json(await liveSnapshot());
  } catch (err) { next(err); }
});

liveRouter.get('/source/:source', async (req, res, next) => {
  try { res.json(await sourceStats(req.params.source)); } catch (err) { next(err); }
});

// QR en SVG para los carteles. Solo para enlaces a la propia web.
liveRouter.get('/qr.svg', async (req, res, next) => {
  try {
    const text = String(req.query.text || '');
    const host = `${req.protocol}://${req.get('host')}`;
    if (text.length > 400 || !(text.startsWith(`${host}/`) || text.startsWith(`${config.publicUrl}/`))) {
      return res.status(400).json({ error: 'El QR solo puede apuntar a tu web.' });
    }
    const svg = await QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#000000', light: '#ffffff' } });
    res.type('image/svg+xml').send(svg);
  } catch (err) { next(err); }
});
