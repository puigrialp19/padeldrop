import bcrypt from 'bcryptjs';

const COST = 12;
// Hash fijo para comparar cuando el email no existe: el tiempo de respuesta no revela qué emails son válidos.
const DUMMY_HASH = bcrypt.hashSync('padel-drop-dummy-password', COST);

export const hashPassword = (plain) => bcrypt.hash(plain, COST);

export function verifyPassword(plain, hash) {
  return bcrypt.compare(String(plain || ''), hash || DUMMY_HASH).then((ok) => ok && Boolean(hash));
}

export function validatePasswordStrength(pw) {
  if (typeof pw !== 'string' || pw.length < 12) return 'La contraseña debe tener al menos 12 caracteres.';
  if (pw.length > 72) return 'La contraseña no puede superar 72 caracteres.';
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return 'La contraseña debe combinar letras y números.';
  return null;
}
