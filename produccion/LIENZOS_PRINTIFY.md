# Lienzos print-on-demand (Printify) — arte por modelo

Cada uno de los **15 modelos** tiene **varias láminas artísticas** y todas van al
mismo producto de Printify (lienzo / canvas). La **carta** es una lámina más:
no es un producto digital ni una tarjeta pequeña, es arte para imprimir.

## 1. Las tres láminas por modelo

| Lámina | Qué es | Fichero web (el que sirve la tienda) | Maestro de impresión |
|---|---|---|---|
| **Delantera** | Figura ¾ frontal | `public/images/{slug}-front.webp` | `public/images/{slug}-front.webp` |
| **Trasera** | Figura ¾ trasera | `public/images/{slug}-rear.webp` | `public/images/{slug}-rear.webp` |
| **Carta** | Lámina vertical con número, nombre, OVR y estadísticas | `public/images/cartas/{nn}-{slug}.webp` | `produccion/cartas/{nn}-{slug}.webp` |

`{nn}` es el número correlativo (`01`..`15`) y `{slug}` el del modelo (`r34`, `r32`,
`350z`, `supra`, `ae86`, `mr2`, `rx7`, `nsx`, `civic`, `s2000`, `evo`, `eclipse`,
`3000gt`, `wrc`, `lfa`).

**15 modelos × 3 láminas = 45 artes.** Las cartas son el arte correlativo 1:1 con
la numeración de la colección: la carta `07` es siempre la del modelo `07`
(El Aullido Rotativo / RX-7), nunca la de otro.

### Cartas: arte y estadísticas

| # | Modelo | Rareza | OVR | VEL | ACE | MAN | POT | EST | RAR | Arte |
|---|---|---|---|---|---|---|---|---|---|---|
| 01 | El Emperador Azul | legendario | 93 | 92 | 90 | 88 | 94 | 95 | 93 | `images/cartas/01-r34.webp` |
| 02 | El Monstruo Púrpura | raro | 92 | 91 | 88 | 86 | 93 | 90 | 94 | `images/cartas/02-r32.webp` |
| 03 | Colmillo Azul | raro | 89 | 88 | 87 | 90 | 89 | 93 | 88 | `images/cartas/03-350z.webp` |
| 04 | La Bestia Naranja | legendario | 94 | 93 | 90 | 88 | 95 | 96 | 94 | `images/cartas/04-supra.webp` |
| 05 | El Fantasma de la Montaña | clasico | 88 | 82 | 85 | 94 | 80 | 92 | 90 | `images/cartas/05-ae86.webp` |
| 06 | El Exótico de Bolsillo | clasico | 86 | 84 | 83 | 92 | 82 | 90 | 87 | `images/cartas/06-mr2.webp` |
| 07 | El Aullido Rotativo | epico | 90 | 90 | 88 | 91 | 87 | 94 | 91 | `images/cartas/07-rx7.webp` |
| 08 | El Samurái Rojo | epico | 91 | 90 | 87 | 93 | 88 | 91 | 92 | `images/cartas/08-nsx.webp` |
| 09 | El Puño Blanco | clasico | 87 | 84 | 86 | 90 | 83 | 88 | 89 | `images/cartas/09-civic.webp` |
| 10 | El Grito Amarillo | raro | 88 | 86 | 87 | 91 | 85 | 89 | 88 | `images/cartas/10-s2000.webp` |
| 11 | El Domador | raro | 89 | 87 | 89 | 90 | 90 | 88 | 89 | `images/cartas/11-evo.webp` |
| 12 | Verde Veneno | clasico | 88 | 86 | 85 | 88 | 86 | 95 | 93 | `images/cartas/12-eclipse.webp` |
| 13 | El Visionario | clasico | 87 | 85 | 84 | 87 | 88 | 89 | 86 | `images/cartas/13-3000gt.webp` |
| 14 | El Azul del Rally | raro | 90 | 88 | 90 | 92 | 89 | 90 | 94 | `images/cartas/14-wrc.webp` |
| 15 | La Voz del V10 | epico | 96 | 96 | 94 | 92 | 97 | 98 | 96 | `images/cartas/15-lfa.webp` |

Fuente única de estos datos: **`api/cartas.js`**. El espejo que usa la web
(`public/js/cartas-data.js`) se regenera con:

```
node tools/generar-cartas-web.mjs
```

Y `node test/cartas.test.mjs` falla si los dos ficheros se desincronizan, si falta
un arte o si un OVR/estadística se sale de rango.

## 2. Especificaciones de impresión

- **Formato de la carta:** 1280 × 1792 px, proporción **5:7** (vertical).
- **Resolución útil:** ~163 DPI a 20 × 30 cm.
- **Tamaño recomendado de lienzo:** **20 × 30 cm** (o 20 × 30 cm vertical con
  sangrado de Printify). A 30 × 40 cm el maestro baja a ~108 DPI, por debajo del
  mínimo de 150: si quieres ese tamaño, hay que **reescalar el maestro a 300 DPI**
  antes de subirlo.
- **Fondo:** negro carbono texturizado; el acabado de la carta (marco dorado)
  llega hasta el borde, así que conviene imprimir a sangre completa
  (*full bleed*) y dejar que Printify recorte.
- **Formato de entrega:** WebP de alta calidad. Printify acepta PNG/JPG; si la
  herramienta rechaza WebP, exporta a PNG sin recomprimir el maestro.
- **Las delanteras y traseras** son cuadradas (1100 × 1100,~1:1): para lienzo
  cuadrado de 20 × 20 cm o 30 × 30 cm.

## 3. Alta del producto en Printify (por lámina)

1. Printify → *My Products* → **Create product** → *Canvas* (proveedor con
   envío a la UE, p. ej. Print Providers en Europa).
2. Tamaño 20 × 30 cm vertical (o el que corresponda).
3. Sube el arte: `produccion/cartas/{nn}-{slug}.webp` para las cartas;
   `public/images/{slug}-front.webp` / `{slug}-rear.webp` para las otras dos.
4. Título sugerido: `SSCARS · {Nombre artístico} — Carta` (o `— Delantera` / `— Trasera`).
5. Descripción: reutiliza la ficha del modelo y el texto de la colección.
6. Cuando el producto esté publicado en Printify, activa su fila en Supabase
   (migración `012_cards_artwork_and_canvas_catalog.sql`): los 45 productos ya
   están creados pero con `active = false`.

## 4. Catálogo en Supabase

La migración **012** deja dados de alta los 45 productos de lienzo:

- `id` / `slug`: `lienzo-{slug}-{arte}`, con `arte` ∈ `delantera | trasera | carta`.
  Ejemplos: `lienzo-r34-carta`, `lienzo-lfa-delantera`.
- `product_type`: `merch`.
- `active = false` hasta que el producto exista en Printify.
- `metadata`: proveedor (`printify`), arte, `imagen`, `maestro_impresion`,
  `medidas_cm`, `dpi_minimo` y la nota de DPI.
- Precios de partida: 39,90 € delantera/trasera y 44,90 € la carta (ajústalos al
  coste real de tu proveedor).

La misma migración mete el arte de cada carta en la tabla `cards`
(`image_path`, `print_master`, `ovr`, `stats`) y en el JSONB `images` de `cars`
(`card`, `card_print`), para que la web y Mi Garaje lo pinten sin tocar código.

Comprobación rápida tras aplicar la migración:

```sql
SELECT COUNT(*) FROM public.cards    WHERE image_path IS NOT NULL;                        -- 15
SELECT COUNT(*) FROM public.products WHERE id LIKE 'lienzo-%' AND product_type = 'merch'; -- 45
```

## 5. Dónde se ve la carta en la tienda

- **Landing (`public/index.html`)** — en la ficha de cada modelo (clic en la foto)
  hay tres vistas: *Delantera · Trasera · Carta del modelo*, con el OVR, la rareza
  y las seis estadísticas. La rejilla muestra el chip `OVR` de cada modelo.
- **Mi Garaje (`public/garage.html`)** — la colección digital usa el arte real de
  la carta de cada modelo (`image_path` de `user_cards.cards`) con el OVR y la
  fila de estadísticas.
