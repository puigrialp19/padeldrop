import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

// Cabeceras de seguridad. La política CSP de la web pública permite Google Fonts y Stripe (como antes);
// la del panel solo permite recursos propios.
export const publicHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      formAction: ["'self'", 'https://buy.stripe.com', 'https://billing.stripe.com'],
      upgradeInsecureRequests: config.isProd ? [] : null,
    },
  },
});

export const adminHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: config.isProd ? [] : null,
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
});

/** Evita que buscadores indexen y que el navegador guarde en caché datos de clientes. */
export function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  next();
}

/** Protección CSRF extra: las peticiones que modifican datos deben venir de nuestra propia web. */
export function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  const host = `${req.protocol}://${req.get('host')}`;
  if (origin && (origin === config.publicUrl || origin === host)) return next();
  return res.status(403).json({ error: 'Origen de la petición no permitido.' });
}

// Máximo 5 intentos de login fallidos por IP y email cada 15 minutos.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.email || '').toLowerCase()}`,
  message: { error: 'Demasiados intentos. Espera 15 minutos antes de volver a probar.' },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
