# Hunyuan3D-2mv — RETRY gratis con vistas corregidas

## Por qué este retry
Antes Hunyuan falló porque las 4 vistas NO eran consistentes entre sí:
- frontal = 832px de alto, lateral = 502px → el frontal era 1,66× más grande
- la línea de suelo estaba a 4 alturas distintas (y=938, 904, 779, 777)

Hunyuan veía "4 coches distintos" y fundía la malla. Ya está corregido:
las 4 vistas ahora miden **800px de alto** y comparten **suelo a y=940**.

## Archivos a subir (en `produccion/tripo-r34/`)
- `1-front.webp`  → Front
- `2-back.webp`   → Back
- `3-left.webp`   → Left
- `4-right.webp`  → Right

## Paso a paso (gratis, 2 minutos)

1. Ve al Space: https://huggingface.co/spaces/tencent/Hunyuan3D-2
   (o busca "Hunyuan3D-2mv" en la pestaña Spaces si ese está lleno)
2. Dentro del Space, ve a la pestaña **"MultiView Prompt"** (NO "Image Prompt").
3. Sube las 4 imágenes en su casilla:
   - Front  → `1-front.webp`
   - Back   → `2-back.webp`
   - Left   → `3-left.webp`
   - Right  → `4-right.webp`
4. Parámetros recomendados (si aparecen):
   - `octree_resolution` → **512** (más detalle; si tarda mucho o da error, baja a 384)
   - `steps` → 30
   - deja `rembg` SIN marcar (el fondo ya es blanco limpio)
5. Pulsa Generate y descarga el GLB.

## Qué mirar (igual que siempre)
1. ¿Silueta R34 chibi reconocible?
2. ¿4 ruedas en su sitio, no fundidas?
3. ¿Alerón con forma?
4. **¿La trasera se ve con sus pilotos?**

## Si SALE bien
→ Fijamos Hunyuan3D-2mv como pipeline gratis para los 15.
   Yo normalizo las vistas de los otros 14 igual que he hecho con el R34.

## Si SIGUE fundido
→ Conclusión definitiva y honesta: las herramientas 100% gratis no pueden dar
   trasera fiel en coches chibi con alerón grande. Entonces solo quedan 2 vías:
   (a) Meshy/Tripo 13€ un solo mes → suficiente para generar los 15 con trasera fiel
       (~0,85€/modelo, muchísimo más barato que freelance).
   (b) Freelance puntual (20-100€/modelo).
   Te diré cuál recomiendo según lo que vea en el retry.
