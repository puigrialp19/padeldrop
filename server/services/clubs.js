// Clubs donde se puede recoger la caja gratis (vamos nosotros cada mes). La clave es el valor del desplegable de Stripe.
// Sin imports: lo usa también server/scripts/stripe-setup.js, que no carga la configuración del servidor.
export const PICKUP_CLUBS = {
  guissona: 'Interpàdel Guissona',
  tarrega: 'Interpàdel Tàrrega',
  golmes: 'Interpàdel Golmés',
};
