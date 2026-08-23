# SSCARS GARAGE COLLECTIONS — V6 FINAL

Landing de la colección limitada JDM + carrito + checkout Stripe + fabricación bajo demanda (JLC3DP).

**Dominio primary:** `sscarsgarage.roadshop.online` (CNAME → `cname.vercel-dns.com`)
**Redirect:** `sscars.roadshop.online` → `sscarsgarage.roadshop.online`
`roadshop.online` queda libre como marketplace de subdominios (futuro).

---

## 1. Estructura del repo

```
sscarsgarage/
├── public/
│   ├── index.html                  # landing V6 completa (HTML/CSS/JS puro, 0 dependencias externas)
│   └── images/
│       ├── logo-sscars-cropped.jpg # 1024x247 (crop del original 1024x1024: top 396 / bottom 643)
│       ├── {slug}-front.webp       # 15 delanteras (todas ¾ frontal, mismo sentido)
│       ├── {slug}-rear.webp        # 15 traseras (todas ¾ trasera, mismo sentido)
│       ├── gold-front.webp         # ejemplo Gold Chrome (NSX dorado)
│       └── gold-rear.webp
├── api/
│   ├── _lib.js                     # Upstash (idempotencia + log), reintentos, avisos por email
│   ├── checkout.js                 # sesión de Stripe Checkout (envío obligatorio + metadata.cantidad)
│   ├── order.js                    # webhook Stripe → sorteo anti-repes + Gold 1/500 → fabricación
│   └── admin.js                    # panel privado /api/admin?key=…
├── package.json
├── vercel.json                     # outputDirectory: public + cache de /images
├── public/robots.txt · public/sitemap.xml
├── .env.example
├── AUDITORIA.md                    # auditoría técnica + de conversión
├── GUIA_3D_Y_PRODUCCION.md         # cómo crear los 3D gratis y cómo fabricar
└── SSCARS_GARAGE_FINAL.md
```

## 2. Mapeo de los 15 modelos (slug = fichero)

| # | Nombre | slug | front | rear |
|---|--------|------|-------|------|
| 01 | El Ronin de Medianoche | r34 | r34-front.webp | r34-rear.webp |
| 02 | El Ogro de la Autopista | r32 | r32-front.webp (piloto rojo eliminado) | r32-rear.webp (nueva) |
| 03 | La Zeta Salvaje | 350z | 350z-front.webp (azul, forma real) | 350z-rear.webp (azul) |
| 04 | El Naranja Furioso | supra | supra-front.webp | supra-rear.webp |
| 05 | El Repartidor de Tofu | ae86 | ae86-front.webp | ae86-rear.webp |
| 06 | El Mini Exótico | mr2 | mr2-front.webp | mr2-rear.webp |
| 07 | El Espíritu Rotativo | rx7 | rx7-front.webp | rx7-rear.webp |
| 08 | El Samurái de Senna | nsx | nsx-front.webp | nsx-rear.webp |
| 09 | El Pequeño Tipo R | civic | civic-front.webp | civic-rear.webp |
| 10 | El Grito VTEC | s2000 | s2000-front.webp | s2000-rear.webp |
| 11 | El Evolucionado | evo | evo-front.webp | evo-rear.webp |
| 12 | El Verde Fosforito | eclipse | eclipse-front.webp (faros fijos) | eclipse-rear.webp |
| 13 | El Gran Turismo | 3000gt | 3000gt-front.webp | 3000gt-rear.webp |
| 14 | El 22B Azul | wrc | wrc-front.webp | wrc-rear.webp |
| 15 | El Ángel Blanco | lfa | lfa-front.webp | lfa-rear.webp |

Sin duplicados: cada modelo usa exclusivamente su propia trasera (el 02 nunca muestra el 01).

**Normalización aplicada a las fotos**
- Delanteras: todas ¾ frontal en el mismo sentido (se espejaron 3000gt, ae86, mr2, nsx).
- Traseras: todas ¾ trasera en el mismo sentido (se espejaron 350z, eclipse, evo, r34, rx7, s2000, wrc).
- `r32-rear`, `lfa-gold-front` y `lfa-gold-rear` se generaron para completar la colección (faltaban).
- Todas reescaladas a máx. 1100 px y recomprimidas a WebP q86 (1,4 MB toda la carpeta).

## 3. Qué incluye la landing

- **Header fijo 64 px** (`position:fixed`, z-index 999): logo 140 px + `COMPRAR AHORA` rojo + carrito con badge + hamburguesa. Drawer a `top:64px`, ancho 100 %, integrado bajo el banner, se cierra al clicar fuera o en un link. Sombra al hacer scroll.
- **Hero:** COLECCIÓN LIMITADA (tracking .35em) / LEYENDAS JDM (rojo) / 15 ICONOS ÚNICOS (negro) + contador rojo de 4 cajas con pulse, target **31/12/2026 23:59:59 Europe/Madrid**, y el aviso “Una vez que el contador llegue a 0…”.
- **Grid de 15 productos:** delantera primero, crossfade a trasera en hover (desktop) y botón `Ver trasera / Ver frente` en móvil. Click en la foto → modal con delantera + trasera lado a lado, cierre con ✕, overlay o `ESC`.
- **ACABADO A COLOR:** texto corto (sin “pintado a mano”) + 3 bullets (resina a color / caja sorpresa / base negra).
- **GOLD CHROME:** ejemplo con las dos fotos doradas + “versión dorada cromada secreta, 1/500 por caja”.
- **Packs:** 24,95 € / 69,95 € (3 cajas, badge MÁS VENDIDO, 3 unidades) / 129,95 € (6 unidades) / 669,95 € (colección completa). Precio en Impact 48 px, tarjetas 1 px #E5E5E5, radio 20, padding 32.
- **Envíos:** solo “Envíos gratis”, sin plazos ni ciudad.
- **FAQ** + **footer blanco centrado** con logo 120 px, iconos SVG (Instagram, Threads, TikTok, YouTube) con hover rojo y el texto legal de no afiliación.
- **Carrito:** localStorage (`sscars_cart_v1`), badge, drawer derecho, +/− cantidades, total, botón **Comprar** → `/api/checkout`.
- **Sin scroll horizontal:** validado con Chromium a 360 / 390 / 1280 px → `scrollWidth == clientWidth` en los tres.
- Textos de taller eliminados (orientación ¾, rareza máxima 100 uds, “de imagen a 3D”, 48-72 h Barcelona).

## 4. Deploy (≈40 min)

1. `git init && git add . && git commit -m "SSCARS V6" && git push` a un repo nuevo de GitHub.
2. Vercel → **Import Project** → Framework: **Other** (ya lo resuelve `vercel.json`, output `public`).
3. Stripe → crea 4 precios de pago único: 24,95 € / 69,95 € / 129,95 € / 669,95 € y copia sus `price_...`.
4. Vercel → Settings → Environment Variables:
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BOX1`, `STRIPE_PRICE_BOX3`, `STRIPE_PRICE_BOX6`, `STRIPE_PRICE_FULL`, `JLC_API_KEY`, `STL_BASE_URL`.
5. Stripe → Webhooks → endpoint `https://sscarsgarage.roadshop.online/api/order`, evento `checkout.session.completed`.
6. Dominio en Vercel: `sscarsgarage.roadshop.online` (CNAME `cname.vercel-dns.com`) + redirect desde `sscars.roadshop.online`.
7. Test con tarjeta `4242 4242 4242 4242`.

## 5. Flujo anti-repes + Gold 1/500

`/api/checkout` calcula `metadata.cantidad` (unidades reales del carrito: 1 / 3 / 6 / 15) y obliga a dirección de envío.
`/api/order` (webhook) verifica la firma, baraja los 15 modelos, corta `cantidad` → **0 repetidos dentro del pedido**, tira un `Math.random() < 0.002` (Gold Chrome 1/500, sustituye al de color en la primera figura) y lanza un pedido a JLC3DP por figura con la misma dirección, `plain_box_no_logo` y DHL.

## 6. Producción / proveedores (uso interno, no aparece en la web)

- **JLC3DP** — https://jlc3dp.com/help/api · Ordering API · resina X Resin, hueco 2 mm con agujero de drenaje · 0,8-1,5 $ pieza + 6-9 $ DHL ≈ **8,55 $** coste → margen ≈ **21,40 $** sobre 29,90 €.
- **Shapeways / Otto** white-label: 18-25 $ pieza, caja 0,35 $.
- **Cajas** Alibaba: 500 uds a 0,15-0,56 $.
- **STL:** tripo3d.ai/app (Image to 3D) → hollow 2 mm → STL → Drive → `STL_BASE_URL`. Nomenclatura: `{slug}.stl` y `{slug}-gold.stl`.

## 7. Pendiente / recomendado

- Sustituir los `href="#"` de las redes sociales y de los links de footer (Envíos, Contacto) por las URLs reales.
- Añadir páginas legales (aviso legal, privacidad, condiciones de venta y desistimiento) — obligatorio para vender en la UE.
- Subir los STL y confirmar los nombres de fichero que espera `api/order.js`.
