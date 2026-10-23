# Stripe de PADEL DROP (modo prueba)

Cuenta: acct_1USXZWRqeFc4ANGh · generado 2026-10-23 con server/scripts/stripe-setup.js

| Pack | Price ID | Enlace de pago |
|---|---|---|
| Pack Básico / PADEL DROP START (11,90 €) | price_1UTmcpRqeFc4ANGhq2s7EBUn | https://buy.stripe.com/test_bJe9AV2Rjb9CfRj5sKeZ200 |
| Pack Intermedio / PADEL DROP PLAYER (15,90 €) | price_1UTmcqRqeFc4ANGhl4OklegC | https://buy.stripe.com/test_9B6cN74ZrfpS34xbR8eZ201 |
| Pack Premium / PADEL DROP PRO (23,90 €) | price_1UTmcrRqeFc4ANGhlw8FjT5R | https://buy.stripe.com/test_bJe28t2Rj91ucF77ASeZ202 |
| Envío mensual (3,50 €) | price_1UTmcsRqeFc4ANGhv4ZEdNkN | (segunda línea de cada enlace) |

- Código de socio: `INTERPADEL-GUISSONA-TARREGA-GOLMES-3` (cupón INTERPADEL10, 10 % primer mes, solo clientes nuevos)
- Portal de cliente: https://billing.stripe.com/p/login/test_bJe9AV2Rjb9CfRj5sKeZ200
- Webhook: https://padel-drop.onrender.com/api/stripe/webhook (checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid)

## SQL para Supabase

```sql
UPDATE packs SET stripe_price_id = 'price_1UTmcpRqeFc4ANGhq2s7EBUn' WHERE slug = 'start';
UPDATE packs SET stripe_price_id = 'price_1UTmcqRqeFc4ANGhl4OklegC' WHERE slug = 'player';
UPDATE packs SET stripe_price_id = 'price_1UTmcrRqeFc4ANGhlw8FjT5R' WHERE slug = 'pro';
```
