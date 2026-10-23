import postgres from 'postgres';
import net from 'node:net';
import path from 'node:path';
import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { config, ROOT } from '../config.js';

let url = config.databaseUrl;
let embedded = null;

// DATABASE_URL=pglite -> PostgreSQL embebido en local (carpeta data/pglite), sin instalar nada.
// Solo para desarrollo: en producción se usa Supabase.
if (url === 'pglite') {
  if (config.isProd) throw new Error('DATABASE_URL=pglite solo vale para desarrollo local.');
  embedded = await startEmbedded();
  url = embedded.url;
}

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

export const sql = postgres(url, {
  ssl: isLocal ? false : 'require',   // Supabase exige conexión cifrada
  // PGlite (local) es un único proceso Postgres: con una conexión las consultas van en orden.
  max: embedded ? 1 : isLocal ? 4 : 10,
  idle_timeout: 20,
  connect_timeout: 15,
  prepare: false,                      // compatible con el "pooler" de Supabase
  onnotice: () => {},                  // silencia avisos "ya existe" al migrar
  types: {
    // Los ids y COUNT() de Postgres son bigint: se devuelven como número normal de JavaScript.
    bigint: { to: 20, from: [20], serialize: (x) => String(x), parse: (x) => Number(x) },
  },
});

/** Cierra conexiones (y el PostgreSQL embebido, si se usa) para que el proceso termine limpio. */
export async function closeDb() {
  await sql.end({ timeout: 5 });
  if (embedded) await embedded.stop();
}

/** Crea las tablas y los packs si no existen (el mismo SQL que se pega en Supabase). */
export async function migrate() {
  await sql.unsafe(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
}

// En local (PGlite) las tablas y los packs se crean solos al conectar; en Supabase, con el SQL de la Etapa 2.
if (embedded) await migrate();

export async function audit(req, action, entity = '', entityId = '', details = '') {
  try {
    await sql`INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip)
      VALUES (${req?.user?.id ?? null}, ${action}, ${entity}, ${String(entityId)},
              ${typeof details === 'string' ? details : JSON.stringify(details)}, ${req?.ip || ''})`;
  } catch (err) {
    console.error('[audit]', err.message); // la auditoría nunca debe tumbar una petición
  }
}

async function startEmbedded() {
  const dir = path.join(ROOT, 'data', 'pglite');
  mkdirSync(dir, { recursive: true });

  // Candado: dos procesos abriendo la misma carpeta la corromperían.
  const lock = path.join(ROOT, 'data', 'pglite.lock');
  if (existsSync(lock)) {
    const pid = Number(readFileSync(lock, 'utf8'));
    let alive = false;
    try { process.kill(pid, 0); alive = true; } catch { /* proceso muerto: candado huérfano */ }
    if (alive && pid !== process.pid) {
      console.error('\n  La base de datos local ya está abierta por otro proceso (¿el servidor está en marcha?).');
      console.error('  Páralo con Ctrl+C en su terminal y vuelve a ejecutar este comando.\n');
      process.exit(1);
    }
    unlinkSync(lock);
  }
  closeSync(openSync(lock, 'wx'));
  writeFileSync(lock, String(process.pid));
  const releaseLock = () => { try { unlinkSync(lock); } catch { /* ya no existe */ } };
  process.on('exit', releaseLock);

  const { PGlite } = await import('@electric-sql/pglite');
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');
  const pg = await PGlite.create(dir);
  const port = await new Promise((resolve, reject) => {
    const s = net.createServer().once('error', reject).listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
  const server = new PGLiteSocketServer({ db: pg, port, host: '127.0.0.1', maxConnections: 1 });
  await server.start();

  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    await server.stop();
    await pg.close();
    releaseLock();
  };
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.once(sig, async () => { try { await sql.end({ timeout: 2 }); await stop(); } finally { process.exit(0); } });
  }
  return { url: `postgres://postgres:postgres@127.0.0.1:${port}/postgres`, stop };
}
