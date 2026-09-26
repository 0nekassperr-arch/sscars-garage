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
│       ├── cartas/{nn}-{slug}.webp # 15 cartas artísticas (1280x1792, numeradas 01..15)
│       ├── gold-front.webp         # ejemplo Gold Chrome (NSX dorado)
│       └── gold-rear.webp
│   └── js/
│       └── cartas-data.js          # carta de cada modelo para el navegador (generado)
├── api/
│   ├── cartas.js                   # fuente única: arte, OVR y estadísticas de las 15 cartas
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

El **nombre artístico** y el **OVR** de cada modelo son los de su carta artística
(`api/cartas.js`), correlativa 1:1 con la numeración de la colección.

| # | Nombre | slug | front | rear | carta (OVR) |
|---|--------|------|-------|------|-------------|
| 01 | El Emperador Azul | r34 | r34-front.webp | r34-rear.webp | cartas/01-r34.webp · 93 |
| 02 | El Monstruo Púrpura | r32 | r32-front.webp (piloto rojo eliminado) | r32-rear.webp (nueva) | cartas/02-r32.webp · 92 |
| 03 | Colmillo Azul | 350z | 350z-front.webp (azul, forma real) | 350z-rear.webp (azul) | cartas/03-350z.webp · 89 |
| 04 | La Bestia Naranja | supra | supra-front.webp | supra-rear.webp | cartas/04-supra.webp · 94 |
| 05 | El Fantasma de la Montaña | ae86 | ae86-front.webp | ae86-rear.webp | cartas/05-ae86.webp · 88 |
| 06 | El Exótico de Bolsillo | mr2 | mr2-front.webp | mr2-rear.webp | cartas/06-mr2.webp · 86 |
| 07 | El Aullido Rotativo | rx7 | rx7-front.webp | rx7-rear.webp | cartas/07-rx7.webp · 90 |
| 08 | El Samurái Rojo | nsx | nsx-front.webp | nsx-rear.webp | cartas/08-nsx.webp · 91 |
| 09 | El Puño Blanco | civic | civic-front.webp | civic-rear.webp | cartas/09-civic.webp · 87 |
| 10 | El Grito Amarillo | s2000 | s2000-front.webp | s2000-rear.webp | cartas/10-s2000.webp · 88 |
| 11 | El Domador | evo | evo-front.webp | evo-rear.webp | cartas/11-evo.webp · 89 |
| 12 | Verde Veneno | eclipse | eclipse-front.webp (faros fijos) | eclipse-rear.webp | cartas/12-eclipse.webp · 88 |
| 13 | El Visionario | 3000gt | 3000gt-front.webp | 3000gt-rear.webp | cartas/13-3000gt.webp · 87 |
| 14 | El Azul del Rally | wrc | wrc-front.webp | wrc-rear.webp | cartas/14-wrc.webp · 90 |
| 15 | La Voz del V10 | lfa | lfa-front.webp | lfa-rear.webp | cartas/15-lfa.webp · 96 |

Las cartas son el arte de cada modelo para los **lienzos print-on-demand**
(Printify): 15 modelos × 3 láminas (delantera, trasera, carta) = 45 productos.
Detalles, medidas y DPI en `produccion/LIENZOS_PRINTIFY.md`.

Sin duplicados: cada modelo usa exclusivamente su propia trasera (el 02 nunca muestra el 01).

**Normalización aplicada a las fotos**
- Delanteras: todas ¾ frontal en el mismo sentido (se espejaron 3000gt, ae86, mr2, nsx).
- Traseras: todas ¾ trasera en el mismo sentido (se espejaron 350z, eclipse, evo, r34, rx7, s2000, wrc).
- `r32-rear`, `lfa-gold-front` y `lfa-gold-rear` se generaron para completar la colección (faltaban).
- Todas reescaladas a máx. 1100 px y recomprimidas a WebP q86 (1,4 MB toda la carpeta).

## 3. Qué incluye la landing

- **Header fijo 64 px** (`position:fixed`, z-index 999): logo 140 px + `COMPRAR AHORA` rojo + carrito con badge + hamburguesa. Drawer a `top:64px`, ancho 100 %, integrado bajo el banner, se cierra al clicar fuera o en un link. Sombra al hacer scroll.
- **Hero:** COLECCIÓN LIMITADA (tracking .35em) / LEYENDAS JDM (rojo) / 15 ICONOS ÚNICOS (negro) + contador rojo de 4 cajas con pulse, target **31/12/2026 23:59:59 Europe/Madrid**, y el aviso “Una vez que el contador llegue a 0…”.
- **Grid de 15 productos:** delantera primero, crossfade a trasera en hover (desktop), chip `OVR` de la carta y botones `Ver trasera / Ver carta` en móvil. Click en la foto o en `Ver carta` → modal con **delantera + trasera + carta** del modelo, su OVR, su rareza y las seis estadísticas (VEL · ACE · MAN · POT · EST · RAR); cierre con ✕, overlay o `ESC`.
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
7. Supabase → aplica las migraciones en orden (`001` … `012`); la **012** mete el arte de las
   15 cartas y el catálogo de los 45 lienzos de Printify.
8. Test con tarjeta `4242 4242 4242 4242`.

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
- **Aplicar la migración 012** (`cards_artwork_and_canvas_catalog.sql`) para que las cartas
  entren en `cards` / `cars.images` y queden dados de alta los 45 lienzos de Printify.
- Crear los lienzos en Printify y activar sus filas (`active = true`) con el precio final;
  medidas, DPI y pasos en `produccion/LIENZOS_PRINTIFY.md`.
- Si alguna carta se rehace, sustituir `produccion/cartas/{nn}-{slug}.webp` (maestro), regenerar
  el arte web y `node tools/generar-cartas-web.mjs`, y volver a lanzar `npm test`.
