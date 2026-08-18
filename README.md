# SSCARS GARAGE COLLECTIONS

Tienda de una página para una colección limitada de figuras JDM en formato caja sorpresa,
con checkout de Stripe y fabricación automática bajo demanda.

- **Vista previa (GitHub Pages, sólo estática):** se publica sola con cada `push` a `main`.
- **Tienda real (Vercel, con pagos):** `sscarsgarage.roadshop.online`

> ⚠️ En GitHub Pages **no hay backend**: la web se ve entera pero el botón *Comprar* no
> puede cobrar, porque las funciones de `/api` sólo existen en Vercel. Es una vista previa
> de diseño, no una tienda operativa.

## Estructura

```
public/            → la web (esto es lo que publica GitHub Pages)
  index.html
  images/          → 15 modelos x 2 vistas + Gold Chrome + logo
  legal/           → aviso legal, privacidad, condiciones, devoluciones (borradores)
api/               → funciones serverless de Vercel
  checkout.js      → crea la sesión de pago de Stripe
  order.js         → webhook: sorteo sin repetidos + Gold 1/500 + envío a fábrica
  admin.js         → panel privado /api/admin?key=…
  _lib.js          → idempotencia, reintentos y avisos por email
```

## Documentación

| Fichero | Contenido |
|---|---|
| `SSCARS_GARAGE_FINAL.md` | Mapa del proyecto, modelos y pasos de despliegue |
| `AUDITORIA.md` | Auditoría técnica y de conversión, con lo que falta |
| `GUIA_3D_Y_PRODUCCION.md` | Cómo generar los 3D gratis y cómo fabricar de verdad |

## Variables de entorno

Copia `.env.example`. Sin `STRIPE_*` la web funciona pero no cobra.

## Lógica de la caja sorpresa

Barajado Fisher-Yates, cero repetidos dentro del mismo pedido, Gold Chrome al 0,2 % por caja
y 2 Gold garantizados en el pack completo. Validado con 20.000 simulaciones.
