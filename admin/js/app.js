import { api } from './api.js';
import { renderDashboard } from './views/dashboard.js';
import { renderCustomers } from './views/customers.js';
import { renderCustomerDetail } from './views/customer-detail.js';
import { renderOrders } from './views/orders.js';
import { toast } from './ui.js';

const view = document.getElementById('view');
const sidebar = document.getElementById('sidebar');
const backdrop = document.getElementById('backdrop');
const menuBtn = document.getElementById('menu');

// Rutas por hash: #/dashboard, #/clientes, #/clientes/12, #/pedidos (con ?filtros opcionales).
const routes = [
  { re: /^\/dashboard$/, nav: 'dashboard', render: renderDashboard },
  { re: /^\/clientes$/, nav: 'clientes', render: renderCustomers },
  { re: /^\/clientes\/(\d+)$/, nav: 'clientes', render: renderCustomerDetail },
  { re: /^\/pedidos$/, nav: 'pedidos', render: renderOrders },
];

export function parseHash() {
  const [path, query = ''] = location.hash.replace(/^#/, '').split('?');
  return { path: path || '/dashboard', params: Object.fromEntries(new URLSearchParams(query)) };
}

/** Actualiza los filtros en la URL sin volver a pintar la vista (para poder compartir/recargar). */
export function setQuery(params) {
  const { path } = parseHash();
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
  history.replaceState(null, '', `#${path}${q ? `?${q}` : ''}`);
}

let renderId = 0;
async function route() {
  const { path, params } = parseHash();
  const match = routes.map((r) => ({ r, m: path.match(r.re) })).find((x) => x.m);
  if (!match) { location.hash = '#/dashboard'; return; }
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === match.r.nav) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  closeMenu();
  const id = ++renderId;
  await match.r.render(view, { params, args: match.m.slice(1), isStale: () => id !== renderId });
  if (id === renderId) view.focus({ preventScroll: true });
}

function openMenu() { sidebar.classList.remove('-translate-x-full'); backdrop.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); }
function closeMenu() { sidebar.classList.add('-translate-x-full'); backdrop.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.addEventListener('click', openMenu);
backdrop.addEventListener('click', closeMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

document.getElementById('logout').addEventListener('click', async () => {
  try { await api.logout(); } catch { /* da igual: se redirige */ }
  location.replace('/admin/login');
});

api.me().then(({ user }) => { document.getElementById('me').textContent = user.email; }).catch(() => toast('No se ha podido cargar tu usuario.', true));

addEventListener('hashchange', route);
route();
