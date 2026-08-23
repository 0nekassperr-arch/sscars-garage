# TRIPO AI — Prueba R34 (multivista, trasera FIEL)

## Qué es esto
Las 4 vistas del R34 ya normalizadas: misma altura de coche y misma línea de suelo en las 4
(esto era lo que confundía a Hunyuan y derretía la malla).

Archivos en `produccion/tripo-r34/` (y en `tripo-r34.zip`):
- `1-front.webp`  → frontal recta
- `2-back.webp`   → trasera recta
- `3-left.webp`   → lateral izquierda
- `4-right.webp`  → lateral derecha

## Paso a paso (2-3 minutos)

1. Abre https://www.tripo3d.ai y regístrate (gratis, te dan créditos de bienvenida).
2. Pulsa **Create** / **Image to Model**.
3. En "Generación por múltiples vistas" (o sube las 4 imágenes donde pida
   Front / Back / Left / Right):
   - `1-front.webp` → Front
   - `2-back.webp`  → Back
   - `3-left.webp`  → Left
   - `4-right.webp` → Right
4. Genera y espera (10-30 s). Descarga el **GLB** (con textura).

### Alternativa: Meshy
- https://www.meshy.ai → "Image to 3D" → modo multi-image (front/back/left/right).
- Mismo orden de imágenes. Registro gratis con créditos.

## Qué mirar al ver el resultado
1. ¿La silueta es un R34 chibi reconocible? (sí/no)
2. ¿Las 4 ruedas están en su sitio, no fundidas con la carrocería?
3. ¿El alerón tiene forma?
4. **¿La trasera se ve?** ¿Tiene sus pilotos redondos y su forma?

Con Tripo/Meshy la trasera SÍ debe verse, porque le damos `2-back.webp`.

## Licencia comercial (IMPORTANTE antes de vender)
- Los créditos gratis de Tripo/Meshy suelen ser para uso NO comercial.
- Para vender la figura necesitarás un plan de pago. Es barato (10-20 $/mes o
  ~0,5-2 $ por coche según uso). Revísalo antes de producción.
- Anota en qué plan generas cada modelo, para el registro de licencias.

## Después de que el GLB sea aceptable
Ahí recién uso Blender (headless, automático) para:
1. Escalar a 70 mm de largo.
2. Reparar manifold (arreglar agujeros).
3. Ahuecar a 2 mm de pared.
4. Añadir agujero de drenaje de 4 mm.
5. Exportar 3MF listo para imprimir.
