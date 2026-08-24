# R34 — Kit de vistas para generar la malla 3D

Set de vistas coherente y calibrado del **R34 "El Emperador Azul"**, listo para
subir a Tripo o Meshy. Todo sale de las fotos que ya están en la web: no se ha
cambiado el diseño de la figura.

---

## 1. Qué generar y con qué

**Recomendación: Tripo (Multiview), no Meshy.**

| | Tripo Multiview | Meshy Multi-View |
|---|---|---|
| Imágenes | 2–4, orden **fijo** front/left/back/right | 1 principal + Left/Back/Right |
| Prioriza | **simetría y proporciones exactas** | detalle de textura (hasta 8K) |
| Salida | quad mesh + PBR, hasta 500K polys | hasta ~600K caras |

Para una figura de resina que hay que **fabricar**, manda la geometría: que el
coche no salga torcido ni con una rueda más grande que otra. Tripo Multiview
está construido justo para eso — reconcilia las vistas y fuerza la simetría,
que es exactamente lo que necesita un molde. Meshy es mejor si lo que buscas es
un render bonito para la web, porque su textura es superior; pero la textura la
vas a tirar igualmente, ya que la figura se pinta en Bayside Blue real.

**Plan:** saca la geometría en Tripo. Si luego quieres un render de marketing,
pasa el GLB por Meshy Retexture.

---

## 2. Qué subir (esto es lo importante)

Sube **solo estas 4**, y en este orden. Están numeradas para que no falle:

```
produccion/vistas3d/r34/kit-tripo/
  1-front.png     ← frontal recta
  2-left.png      ← lateral izquierdo
  3-back.png      ← trasera recta
  4-right.png     ← lateral derecho
```

> **No subas las 12.** Tripo solo acepta 4 y Meshy también. Las otras 8 son para
> revisar el resultado y para el proveedor, no para el generador.

Las 4 elegidas son las **vistas rectas**, no las de tres cuartos. Motivo: son
casi ortográficas y comparten escala, así que definen las proporciones sin
escorzo. Una vista en tres cuartos tiene perspectiva, y la perspectiva es
justo lo que hace que estos modelos deformen el morro.

### Ajustes en Tripo

| Ajuste | Valor | Por qué |
|---|---|---|
| Modo | **Multiview** | con 1 sola imagen se inventa el resto |
| Geometry quality | **Detailed** | el alerón y los 4 pilotos son detalle fino |
| Texture | on, **standard** | la vas a sustituir por pintura real |
| PBR | off | no aporta nada a un molde |
| Quad | **on** | topología limpia para retocar en Blender |
| Polygon limit | 50.000 | suficiente y manejable |
| Texture alignment | original_image | respeta el color de las fotos |
| AI Complete | *no aparece* | Tripo lo desactiva en multiview |

---

## 3. Las 13 vistas del set

`produccion/vistas3d/r34/` — cada una en `blanco/` (fondo blanco) y `alfa/`
(PNG transparente), 1024×1024.

**Reales, de la sesión de producto (6 únicas):**

1. `r34-frontal-recta` — frontal
2. `r34-lateral` — lateral izquierdo
3. `r34-trasera-recta` — trasera
4. `r34-tresc-frontal` — 3/4 delantero
5. `r34-tresc-trasera` — 3/4 trasero
6. `r34-cenital` — planta

**Espejos (pixeles originales, lado contrario):**

7. `r34-lateral-derecha` — ya venía en el repo
8. `r34-tresc-frontal-espejo`
9. `r34-tresc-trasera-espejo`

**Generadas a partir de las reales (ángulos elevados que no existían):**

10. `r34-tresc-frontal-alto`
11. `r34-tresc-trasera-alto`
12. `r34-tresc-frontal-alto-espejo`
13. `r34-tresc-trasera-alto-espejo`

Revisión rápida: `hoja_contactos.jpg` y `turntable.gif`.

---

## 4. Dos cosas que conviene saber

**Los laterales eran el mismo archivo.** `r34-lateral-derecha` es el espejo
exacto de `r34-lateral` (RMSE 0,36 %, comprobado). No es un problema — la figura
es simétrica y Tripo agradece la simetría — pero significa que la sesión de
fotos original tiene **6 ángulos únicos**, no 7.

**Las fotos de catálogo no estaban a la misma escala.** Esto sí era un problema
real. Medido sobre las originales, el coche ocupaba:

| Vista | Altura del coche | Escala relativa |
|---|---|---|
| lateral | 498 px | 1,00 (patrón) |
| trasera-recta | 669 px | 0,74 |
| frontal-recta | 829 px | **0,60** |

El frontal estaba **~1,7× más cerca** que el lateral. Subido así, el generador
deduce que el coche es mucho más ancho y alto de lo que es, y saca una malla
achatada. `normalizar_vistas.py` lo corrige llevando todas las vistas a una
altura común de 473 px. Es el paso que más afecta al resultado final.

---

## 5. Reproducir el pipeline

```bash
python3 produccion/tools/normalizar_vistas.py r34   # segmenta + calibra escala
python3 produccion/tools/derivar_espejos.py r34     # vistas simétricas
python3 produccion/tools/procesar_generadas.py r34  # limpia las elevadas
python3 produccion/tools/preparar_kit.py r34        # kit + hoja + turntable
```

Requiere `pillow`, `numpy`, `scipy` e ImageMagick.

Para los otros 14 modelos, los tres primeros scripts funcionan tal cual
(`... .py rx7`). Solo hay que generar antes las vistas elevadas si las quieres,
porque esas sí son específicas de cada coche.

---

## 6. Al recibir la malla

Comprueba en este orden:

1. **Simetría** — las dos mitades iguales. Es lo que más rompe un molde.
2. **Cuatro pilotos traseros** — dos círculos por lado, la firma del R34. Si
   salen fundidos en dos manchas, regenera.
3. **Alerón** — separado del maletero, con sus dos montantes visibles.
4. **Ruedas** — las cuatro del mismo diámetro y apoyadas en el mismo plano.
5. **Grosor mínimo** — nada por debajo de 1,5 mm o no se puede imprimir.

Los puntos 3 y 5 son los que suelen fallar. El alerón es una pieza fina y
volada: si sale pegado o demasiado delgado, sepáralo en Blender antes de mandar
nada a fábrica. Tienes `produccion/blender/preparar_figura.py` para el escalado
y la comprobación de grosores.
