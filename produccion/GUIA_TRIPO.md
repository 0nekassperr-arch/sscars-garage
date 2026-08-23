# TRIPO AI — Pipeline 3D DEFINITIVO (multivista, trasera FIEL)

## DECISIÓN (a día de hoy)
TRELLIS con UNA sola imagen dio una silueta reconocible pero **demasiado blanda/derretida**:
llantas deformadas, bajo/parachoques trasero fundido y sin detalle fino. Para una figura
premium **no vale**. Por eso el pipeline es **Tripo o Meshy en modo multivista** (4 vistas),
que da mucha más nitidez y fidelidad. **Este es el flujo que usaremos para los 15.**

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

## Qué mirar al ver el resultado (miradlo CON LUPA)
1. ¿Silueta R34 chibi reconocible? (sí/no)
2. **¿Las llantas son 5 radios definidas y limpias**, o se ven blandas/colapsadas?
3. **¿La trasera está limpia**: pilotos redondos + parachoques con forma, **sin masa fundida** ni bultos colgando?
4. ¿El alerón tiene forma y no es una mancha?
5. ¿Se aprecia **detalle/cantos** (no un look de plastilina)?

> Si las llantas están blandas, la trasera es un amasijo o no hay detalle → **NO vale**.
> Con las 4 vistas de Tripo debe verse nítido; si aun así sale blando, sube la
> resolución/calidad del plan y repite.

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
