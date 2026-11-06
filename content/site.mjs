// Datos comerciales que usan las páginas de contenido, el sitemap y llms.txt.
// Deben coincidir con public/js/config.js y con las condiciones de contratación. Si cambian los precios, cámbialos aquí y ejecuta: npm run build:content
export const SITE = 'https://www.padeldrop.net';
export const EMAIL = 'padeldropp@gmail.com';
export const PACKS = [
  { id: 'start', name: 'START', price: '10,90', cans: 1, grips: 2, who: '1 partido a la semana (así lo indica la ficha del pack)' },
  { id: 'player', name: 'PLAYER', price: '15,90', cans: 2, grips: 3, who: 'quien juega con más frecuencia' },
  { id: 'pro', name: 'PRO', price: '19,90', cans: 3, grips: 3, who: 'jugadores habituales' },
];
export const SHIPPING = [
  ['Envío a domicilio', '2,75 €'],
  ['Oficina de Correos o CityPaq (locker)', '2,05 €'],
  ['Recogida en club Interpàdel (Guissona, Tàrrega o Golmés)', 'Gratis'],
];
export const CLUBS = [
  ['Interpàdel Guissona', 'Carrer Bonaigua, 14, 25210 Guissona (Lleida)'],
  ['Interpàdel Tàrrega', 'Av. de la Canaleta, 69B, 25300 Tàrrega (Lleida)'],
  ['Interpàdel Golmés', 'Carrer Barcelona, 3, 25241 Golmés (Lleida)'],
];
