// Crea un administrador o cambia su contraseña.
// Uso: npm run create-admin -- persona@padeldrop.com
// La contraseña se lee de la variable ADMIN_PASSWORD o se pide por consola (no queda en el historial).
import { createInterface } from 'node:readline/promises';
import { sql, closeDb } from '../db/db.js';
import { hashPassword, validatePasswordStrength } from '../services/passwords.js';

const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Indica un email válido: npm run create-admin -- persona@padeldrop.com');
  process.exit(1);
}

let password = process.env.ADMIN_PASSWORD || '';
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question('Contraseña para el panel (mínimo 12 caracteres, letras y números): ');
  rl.close();
}
const problem = validatePasswordStrength(password);
if (problem) {
  console.error(problem);
  process.exit(1);
}

try {
  const hash = await hashPassword(password);
  const [existing] = await sql`SELECT id FROM users WHERE lower(email) = ${email}`;
  if (existing) {
    await sql`UPDATE users SET password_hash = ${hash}, role = 'ADMIN', updated_at = now() WHERE id = ${existing.id}`;
    // Cierra las sesiones abiertas de ese usuario al cambiar la contraseña.
    await sql`DELETE FROM sessions WHERE user_id = ${existing.id}`;
  } else {
    await sql`INSERT INTO users (email, password_hash, role) VALUES (${email}, ${hash}, 'ADMIN')`;
  }
  console.log(`Administrador listo: ${email}. Ya puedes entrar en /admin`);
} catch (err) {
  console.error('No se ha podido crear el administrador:', err.message);
  process.exitCode = 1;
} finally {
  await closeDb();
}
