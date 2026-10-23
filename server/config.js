import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// En local se leen .env.local (prioritario) y .env. En producción las variables las pone el hosting.
for (const file of ['.env.local', '.env']) {
  const full = path.join(ROOT, file);
  if (existsSync(full)) process.loadEnvFile(full);
}

const env = process.env;
const isProd = env.NODE_ENV === 'production';
const port = Number(env.PORT || 3000);

export const config = {
  isProd,
  port,
  // URL pública exacta de la web (se usa para validar el origen de las peticiones y en los enlaces).
  // En Render, si no se indica PUBLIC_URL, se usa la dirección que Render asigna (RENDER_EXTERNAL_URL).
  publicUrl: (env.PUBLIC_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${port}`).replace(/\/$/, ''),
  databaseUrl: env.DATABASE_URL || '',
  sessionHours: Number(env.SESSION_HOURS || 8),
  cookieName: isProd ? '__Host-pd_admin' : 'pd_admin',
  trustProxy: env.TRUST_PROXY || (isProd ? '1' : ''),
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY || '',
    webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    shippingPriceId: env.STRIPE_SHIPPING_PRICE_ID || '',
  },
  paths: {
    public: path.join(ROOT, 'public'),
    admin: path.join(ROOT, 'admin'),
  },
};

if (!config.databaseUrl) {
  console.error('\n  Falta DATABASE_URL. Copia .env.local.example como .env.local y rellénalo (ver README).\n');
  process.exit(1);
}
if (isProd && !config.publicUrl.startsWith('https://')) {
  console.error('\n  En producción PUBLIC_URL debe empezar por https://\n');
  process.exit(1);
}
