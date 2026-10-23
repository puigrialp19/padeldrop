# Objetos de Stripe (MODO PRUEBAS)

Cuenta: `acct_1USXZLRq7KJQz9G9` (Padel Drop, livemode=false). No hay claves secretas en el proyecto: la web solo usa URLs públicas de Payment Links.

| Plan | Producto | Precio mensual (IVA incl.) | Price ID | Payment Link |
|---|---|---|---|---|
| START (2 botes + 2 grips) | prod_VTUdqNcb6lNUHT | 11,90 € | price_1UTR6WRq7KJQz9G9XnGJvUvf | plink_1UTcYDRq7KJQz9G916jBPVQd |
| PLAYER (3 + 3) | prod_VTUdNY9gxJvJ1z | 15,90 € | price_1UTR6ZRq7KJQz9G9LsL75KUQ | plink_1UTcYIRq7KJQz9G92QA12OIo |
| PRO (5 + 5) | prod_VTa8eLGXHgou3s | 23,90 € | price_1UTR6bRq7KJQz9G9dnELxvRj | plink_1UTcYNRq7KJQz9G9QLBUPBwA |
| Envío mensual | prod_VUPwBCNwTbw0d9 | 3,50 € | price_1UTSGRRq7KJQz9G9pcum76B0 | (segunda línea de cada link) |

- Cada Payment Link contiene el pack + el envío (2 líneas recurrentes), recoge nombre, teléfono, dirección de facturación y envío (solo España) y admite códigos promocionales.
- Cupón `3CEXKYdR` (10 %, solo el primer mes). Código promocional `promo_1UStwYRq7KJQz9G9UY9c1OYZ` = `INTERPADEL-GUISSONA-TARREGA-GOLMES-3` (solo clientes nuevos).
- Portal de cliente: configuración `bpc_1USczCRq7KJQz9G9jLV304Aa` (facturas, método de pago, datos, cancelación al final del periodo, cambio de pack).
- Las URLs de los Payment Links están en `js/config.js`. Para vender en real hay que recrear todo en modo real.
