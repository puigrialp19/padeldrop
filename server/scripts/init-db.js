// Crea las tablas y los 3 packs en la base de datos de DATABASE_URL. Seguro de ejecutar varias veces.
// (Es el mismo SQL que se puede pegar a mano en el editor SQL de Supabase: server/db/schema.sql)
import { sql, migrate, closeDb } from '../db/db.js';

try {
  await migrate();
  const packs = await sql`SELECT slug, name, price_cents FROM packs ORDER BY sort_order`;
  console.log('Base de datos lista. Packs:', packs.map((p) => `${p.name} (${(p.price_cents / 100).toFixed(2)} €)`).join(', '));
} catch (err) {
  console.error('No se ha podido crear el esquema:', err.message);
  process.exitCode = 1;
} finally {
  await closeDb();
}
