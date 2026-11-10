# Stripe de RALLYBOX (MODO REAL)

Cuenta: acct_1USXZLRq7KJQz9G9 · generado 2026-11-03 con server/scripts/stripe-setup.js

| Pack | Price ID | Enlace de pago |
|---|---|---|
| Pack Básico / RALLYBOX START (10,90 €) | price_1UXe0LRq7KJQz9G9okhaaqdq | https://buy.stripe.com/9B69AV3Vm9Ge74fcB0eZ21o |
| Pack Intermedio / RALLYBOX PLAYER (15,90 €) | price_1UXe0NRq7KJQz9G9zdKpijhL | https://buy.stripe.com/00waEZ0Jaf0y3S30SieZ21l |
| Pack Premium / RALLYBOX PRO (19,90 €) | price_1UXe0QRq7KJQz9G9Iqs6tuSV | https://buy.stripe.com/cNi28tajK2dMbkv44ueZ21i |
| Envío a domicilio (2,75 €) | price_1UXe0TRq7KJQz9G94xaouHkH | (segunda línea de cada enlace a domicilio) |
| Envío a oficina/CityPaq (2,05 €) | price_1UXe0VRq7KJQz9G9dDc3Epln | (segunda línea de cada enlace a oficina) |
| RALLYBOX START · oficina de Correos o CityPaq | price_1UXe0LRq7KJQz9G9okhaaqdq | https://buy.stripe.com/eVqeVfeA08Ca1JV6cCeZ21n |
| RALLYBOX PLAYER · oficina de Correos o CityPaq | price_1UXe0NRq7KJQz9G9zdKpijhL | https://buy.stripe.com/fZucN7eA03hQ60b44ueZ21k |
| RALLYBOX PRO · oficina de Correos o CityPaq | price_1UXe0QRq7KJQz9G9Iqs6tuSV | https://buy.stripe.com/cNicN763u05Ecoz0SieZ21h |
| RALLYBOX START · recogida en club (sin envío) | price_1UXe0LRq7KJQz9G9okhaaqdq | https://buy.stripe.com/7sYcN777yf0yewHfNceZ21m |
| RALLYBOX PLAYER · recogida en club (sin envío) | price_1UXe0NRq7KJQz9G9zdKpijhL | https://buy.stripe.com/00w8wReA09Ge88j0SieZ21j |
| RALLYBOX PRO · recogida en club (sin envío) | price_1UXe0QRq7KJQz9G9Iqs6tuSV | https://buy.stripe.com/9B6bJ3ajKbOm60beJ8eZ21g |

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
