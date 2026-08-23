# TRELLIS.2 — Prueba R34 (1 sola imagen)

## Por qué cambiamos
Hunyuan3D-2mv derrite el coche chibi (trasera fundida, alerón/ruedas deformes) incluso con
4 vistas ortográficas correctas. Es limitación de la herramienta, no de las fotos.
TRELLIS.2 genera malla más limpia desde UNA imagen y tiene licencia MIT (seguro para vender).

## Archivo a subir
`r34-input-single.webp`  (¾ frontal de producto, fondo blanco, 1024×1024)

## Cómo probarlo (gratis)

### Opción A — Space en HuggingFace (más cómodo, sin instalar nada)
1. Ve a https://huggingface.co/spaces y busca `TRELLIS` (o `TRELLIS-2`).
   Alternativas: `microsoft/TRELLIS`, `TripoSR` (TripoSR también sirve y es MIT).
2. Sube `r34-input-single.webp` en el cuadro de imagen.
3. Deja los parámetros por defecto la primera vez (octree resolution 512, num steps ~50).
4. Pulsa Generate y espera. Descarga el `.glb`.

### Opción B — Si quieres probar también TripoSR (más rápido, menos detalle)
- https://huggingface.co/spaces/finegrain/finegrain-image-to-3d (o TripoSR)
- Mismo flujo: 1 imagen → GLB.

## Cómo juzgar el resultado (importante)
Mira SOLO estas 4 cosas, en orden:
1. ¿La silueta general es un coche chibi reconocible? (sí/no)
2. ¿Las 4 ruedas están donde toca? (no fundidas con la carrocería)
3. ¿El alerón tiene forma, no una mancha?
4. ¿La trasera no está "derretida"?

Si el resultado de TRELLIS es claramente MEJOR que el de Hunyuan (aunque no sea perfecto),
ese es el camino. La trasera puede no ser 100% exacta al producto porque TRELLIS la
reconstruye desde una sola vista — eso se corrige después con un ajuste menor o se acepta
en una figura estilizada.

## Qué NO haremos
- No volver a gastar generaciones de Hunyuan multivista (no mejora).
- No usar Blender para "arreglar" una malla derretida (imposible).
- Blender solo se usará DESPUÉS, cuando tengamos un GLB aceptable: escalar a 70 mm,
  reparar manifold, ahuecar 2 mm y agujero de drenaje de 4 mm, exportar 3MF.

## Decisión tras la prueba
- Si TRELLIS da mejor malla → fijamos TRELLIS como pipeline para los 15 modelos
  (1 imagen ¾ frontal por coche, ya las tenemos todas en public/images/*-front.webp).
- Si TRELLIS también sale mal → el problema es la figura en sí (chibi + alerón grande)
  y habrá que valorar: modelado manual sencillo o un freelance puntual. Te lo diré claro,
  sin rodeos.
