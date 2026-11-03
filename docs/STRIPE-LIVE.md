# Stripe de PADEL DROP (MODO REAL)

Cuenta: acct_1USXZLRq7KJQz9G9 · generado 2026-11-03 con server/scripts/stripe-setup.js

| Pack | Price ID | Enlace de pago |
|---|---|---|
| Pack Básico / PADEL DROP START (10,90 €) | price_1UXe0LRq7KJQz9G9okhaaqdq | https://buy.stripe.com/eVq14peA03hQ1JV6cCeZ20x |
| Pack Intermedio / PADEL DROP PLAYER (15,90 €) | price_1UXe0NRq7KJQz9G9zdKpijhL | https://buy.stripe.com/fZu3cx63u7y6fAL30qeZ20A |
| Pack Premium / PADEL DROP PRO (19,90 €) | price_1UXe0QRq7KJQz9G9Iqs6tuSV | https://buy.stripe.com/9B6dRb9fGf0ycozbwWeZ20D |
| Envío a domicilio (2,75 €) | price_1UXe0TRq7KJQz9G94xaouHkH | (segunda línea de cada enlace a domicilio) |
| Envío a oficina/CityPaq (2,05 €) | price_1UXe0VRq7KJQz9G9dDc3Epln | (segunda línea de cada enlace a oficina) |
| PADEL DROP START · oficina de Correos o CityPaq | price_1UXe0LRq7KJQz9G9okhaaqdq | https://buy.stripe.com/9B6aEZ2Ri3hQbkv58yeZ20y |
| PADEL DROP PLAYER · oficina de Correos o CityPaq | price_1UXe0NRq7KJQz9G9zdKpijhL | https://buy.stripe.com/dRmaEZbnO5pYfALbwWeZ20B |
| PADEL DROP PRO · oficina de Correos o CityPaq | price_1UXe0QRq7KJQz9G9Iqs6tuSV | https://buy.stripe.com/4gM00lbnO4lU88jfNceZ20E |
| PADEL DROP START · recogida en club (sin envío) | price_1UXe0LRq7KJQz9G9okhaaqdq | https://buy.stripe.com/4gMbJ31Ne2dM74feJ8eZ20z |
| PADEL DROP PLAYER · recogida en club (sin envío) | price_1UXe0NRq7KJQz9G9zdKpijhL | https://buy.stripe.com/eVq7sN3Vm7y64W730qeZ20C |
| PADEL DROP PRO · recogida en club (sin envío) | price_1UXe0QRq7KJQz9G9Iqs6tuSV | https://buy.stripe.com/8x200l4Zq5pY88j8kKeZ20F |

Cada 2 y 3 meses (mismo precio por caja): todos los enlaces están en public/js/links.js.

- Código de socio: `INTERPADEL-GUISSONA-TARREGA-GOLMES-3` (cupón INTERPADEL10-PACK, 10 % sobre el pack en el primer cobro, sin descontar el envío, solo clientes nuevos)
- Portal de cliente: https://billing.stripe.com/p/login/7sY28t0Ja8Ca88jgRgeZ200
- Webhook: https://www.padeldrop.net/api/stripe/webhook (checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid, charge.refunded)

## SQL para Supabase

```sql
UPDATE packs SET stripe_price_id = 'price_1UXe0LRq7KJQz9G9okhaaqdq', cans = 1, grips = 2, price_cents = 1090 WHERE slug = 'start';
UPDATE packs SET stripe_price_id = 'price_1UXe0NRq7KJQz9G9zdKpijhL', cans = 2, grips = 3, price_cents = 1590 WHERE slug = 'player';
UPDATE packs SET stripe_price_id = 'price_1UXe0QRq7KJQz9G9Iqs6tuSV', cans = 3, grips = 3, price_cents = 1990 WHERE slug = 'pro';
```
