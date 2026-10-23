const form = document.getElementById('login');
const errorBox = document.getElementById('error');
const submit = document.getElementById('submit');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.hidden = true;
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) {
    errorBox.textContent = 'Escribe tu email y tu contraseña.';
    errorBox.hidden = false;
    return;
  }
  submit.disabled = true;
  submit.textContent = 'Comprobando…';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      location.replace('/admin');
      return;
    }
    const data = await res.json().catch(() => ({}));
    errorBox.textContent = data.error || 'No se ha podido iniciar sesión.';
    errorBox.hidden = false;
    form.password.value = '';
    form.password.focus();
  } catch {
    errorBox.textContent = 'Sin conexión con el servidor. Inténtalo de nuevo.';
    errorBox.hidden = false;
  } finally {
    submit.disabled = false;
    submit.textContent = 'Entrar';
  }
});
