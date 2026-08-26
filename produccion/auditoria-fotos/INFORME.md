# Auditoría de coherencia de fotos de producto

15 modelos × 2 vistas (`-front.webp` / `-rear.webp`). Se comprueba que ambas vistas
correspondan **a la misma miniatura**: mismo alerón, mismas llantas, mismo kit de
carrocería, mismo color y mismo nivel de detalle.

Fecha: 25/08/2026 · Pares comparativos en esta misma carpeta (`<modelo>.jpg`).

---

## Resumen

| Estado | Modelos |
|---|---|
| ✅ Coherente | R34, R32, 350Z, AE86, MR2, NSX, Civic, S2000, 3000GT, LFA |
| 🔧 Corregido | Eclipse, Evo, Supra, RX-7, WRC |

**10 de 15 estaban correctos. Los 5 restantes se han corregido.** Colección fiel y coherente al 100 %.

---

## 🔧 Eclipse — CORREGIDO

Era el fallo grave: las dos fotos eran **dos miniaturas distintas**.

| | Front (antigua) | Rear |
|---|---|---|
| Alerón | Macizo tipo "asa" cerrada, pieza única | GT de competición: doble plano + gurney, dos montantes centrales, placas laterales con relieve y 3 agujeros |
| Llantas | 5 radios rectos y planos | 5 radios cóncavos con buje pronunciado |
| Neumático | Liso, sin dibujo | Con dibujo de banda de rodadura |
| Carrocería | Lisa, poco detalle | Líneas de puerta, tornillería, taloneras esculpidas |

**Decisión: el alerón GT de la vista trasera es el diseño oficial.**

`public/images/eclipse-front.webp` regenerado con ese alerón (propuesta B), a 1100×733 WebP,
manteniendo ángulo, color, faros, parachoques y fondo originales.

- Original preservado en `produccion/eclipse-fix/original-backup/eclipse-front-ORIGINAL.webp`
- Propuesta A descartada en `produccion/eclipse-fix/eclipse-front-propuesta-A.jpg`
- Resultado verificado en `eclipse-CORREGIDO.jpg`

---

## 🔧 Evo — CORREGIDO

Era **la misma miniatura** (mismo alerón blanco de doble montante, mismo kit, mismo color),
pero con distinto **grado de deformación chibi**:

- **Front**: muy caricaturizado. Distancia entre ejes muy corta, ruedas enormes tipo
  monster-truck, carrocería achatada.
- **Rear (antigua)**: proporciones bastante más realistas. Berlina de 4 puertas casi
  normal, ruedas proporcionadas.

Puestas una al lado de otra no parecían la misma escala de estilización, lo que rompía la
uniformidad frente al resto de la colección.

**Decisión: manda la filosofía de la vista delantera — estilo chibi acentuado.**

`public/images/evo-rear.webp` regenerado con las proporciones exageradas del frontal
(batalla corta, carrocería compacta, ruedas grandes de taco con llanta gris de 5 radios),
conservando alerón, pilotos, difusor, escape, cristales tintados, color y encuadre.
Se mantiene a 1024×1024 WebP, su resolución original.

- Original preservado en `produccion/evo-fix/original-backup/evo-rear-ORIGINAL.webp`
- Propuesta A descartada en `produccion/evo-fix/evo-rear-propuesta-A.jpg`
- Resultado verificado en `evo-CORREGIDO.jpg`

Este criterio queda fijado para futuras generaciones: **el estilo de referencia de la
colección es el chibi acentuado**, coherente con Civic, WRC y R32.

---

## 🔧 Supra — CORREGIDO

La vista trasera original tenía un fallo grave de fidelidad respecto al vehículo real:
los **pilotos traseros eran formas ovaladas/triangulares tipo lágrima** (más parecidos a un
Celica T230 o un Eclipse), en lugar de la mítica configuración del Toyota Supra MK4 (JZA80).

| | Rear (antigua) | Rear (corregida) |
|---|---|---|
| Pilotos traseros | Ovalados / puntiagudos rojos genéricos | Ópticas icónicas Supra MK4: carcasas oscurecidas con 4 focos circulares independientes por lado |
| Lentes | Lente roja uniforme | Cuatro ópticas redondas (intermitente ámbar, dos de freno rojas y marcha atrás transparente) |
| Coherencia | Mismo color naranja mate y proporciones | 100 % fiel al Supra 1997 real y coherente con el frontal |

`public/images/supra-rear.webp` regenerado a 1024×1024 WebP, manteniendo el acabado naranja mate,
el alerón alto en arco, las llantas cromadas de 5 radios, el escape cromado a la izquierda
y el encuadre/fondo blanco de estudio idéntico al frontal `supra-front.webp`.

- Original preservado en `produccion/supra-fix/original-backup/supra-rear-ORIGINAL.webp`
- Vista trasera recta actualizada en `produccion/referencias/supra/supra-trasera-recta.webp`
- Comparativa y propuestas en `produccion/supra-fix/`
- Resultado verificado en `supra-CORREGIDO.jpg`

---

## 🔧 RX-7 — CORREGIDO

La vista trasera original tenía dos **botones circulares rojos genéricos** sin detalle,
perdiendo el rasgo más representativo de la zaga del Mazda RX-7 FD3S.

| | Rear (antigua) | Rear (corregida) |
|---|---|---|
| Pilotos traseros | Dos botones rojos individuales tipo dibujo animado | Franja horizontal oscurecida característica (Kouki / Series 8) con 3 ópticas redondas por lado |
| Lentes | Rojo liso genérico | Tres círculos por lado: intermitente ámbar exterior + dos ópticas de freno/posición rojas |
| Coherencia | Mismo amarillo, alerón rectangular y aletas anchas | 100 % fiel al RX-7 FD3S y coherente con el frontal |

`public/images/rx7-rear.webp` regenerado a 1024×1024 WebP, manteniendo el color amarillo brillante,
el kit ensanchado con remaches, las llantas negras de garganta amarilla y el escape cromado a la izquierda.

- Original preservado en `produccion/rx7-fix/original-backup/rx7-rear-ORIGINAL.webp`
- Referencia 3D actualizada en `produccion/referencias/rx7/rx7-tresc-trasera.webp`
- Comparativa y propuestas en `produccion/rx7-fix/`
- Resultado verificado en `rx7-CORREGIDO.jpg`

---

## 🔧 WRC — CORREGIDO

La vista trasera del Subaru Impreza WRC también presentaba **dos focos rojos circulares genéricos**,
en lugar de las ópticas reales de la generación GD (Bugeye 2001-2002).

| | Rear (antigua) | Rear (corregida) |
|---|---|---|
| Pilotos traseros | Dos círculos rojos tipo botón | Conjunto trapezoidal característico de Impreza GD envolvente hacia la aleta |
| Lentes | Solo lente roja | Bicolor auténtico: mitad superior transparente/blanca (marcha atrás/intermitente) y mitad inferior roja con ranurado horizontal |
| Coherencia | Mismo azul rally, llantas doradas y alerón | 100 % fiel al Impreza WRC de competición y coherente con el frontal |

`public/images/wrc-rear.webp` regenerado a 1024×1024 WebP, manteniendo el azul metalizado,
las llantas de competición doradas de 6 radios, el alerón WRC alto y el escape cromado a la izquierda.

- Original preservado en `produccion/wrc-fix/original-backup/wrc-rear-ORIGINAL.webp`
- Referencia 3D actualizada en `produccion/referencias/wrc/wrc-tresc-trasera.webp`
- Comparativa y propuestas en `produccion/wrc-fix/`
- Resultado verificado en `wrc-CORREGIDO.jpg`

---

## Observación adicional: resoluciones desiguales

No afecta a la coherencia del producto pero sí a la calidad percibida y al uso como
referencia 3D:

| Resolución | Modelos |
|---|---|
| 1100×733 en ambas | 350Z, Eclipse, R32 |
| 1100×733 front / 1024×1024 rear | 3000GT, Civic, Evo, LFA, NSX, RX-7, S2000, Supra, WRC |
| 1100×733 front / 1100×1100 rear | AE86, MR2 |
| 1024×1024 en ambas | R34, Gold |

Casos sueltos: `lfa-front.webp` mide 1100×**734** (un píxel de más).

Meshy recomienda ≥1040×1040 px. Si se van a generar mallas 3D del resto de modelos como
se hizo con el R34, conviene homogeneizar a un tamaño único y subir resolución.

---

## Método

```bash
# par comparativo por modelo
convert <m>-front.webp -resize 900x900 -gravity center -background white -extent 920x920 _f.png
convert <m>-rear.webp  -resize 900x900 -gravity center -background white -extent 920x920 _r.png
montage _f.png _r.png -tile 2x1 -geometry +8+8 -background '#DDDDDD' <m>.png
```

Revisión visual de alerón, llantas, neumáticos, kit de carrocería, color y nivel de detalle.
