# CÓMO SUBIR VARIAS FOTOS A HUNYUAN3D — paso a paso

## ¿Tengo suficientes fotos? SÍ

Tienes **47 imágenes en 15 carpetas**, una por modelo. Cada carpeta lleva las 3 vistas que el modelo multi-vista necesita:

| Vista | Fichero | Para qué sirve |
|---|---|---|
| ¾ frontal | `{slug}-tresc-frontal.webp` | Morro, capó, faros |
| ¾ trasera | `{slug}-tresc-trasera.webp` | Cola, alerón, escape |
| Lateral | `{slug}-lateral.webp` | Silueta y longitud |

El R34 lleva además vista frontal recta y cenital: es el que más calidad dará y por eso conviene empezar por él.

**Con 3 vistas es suficiente.** El modelo acepta hasta 4 y la cuarta (derecha) es opcional; como los coches son casi simétricos, aporta poco.

---

## PASO 1 · Encontrar el sitio correcto (aquí falla todo el mundo)

1. Entra en **huggingface.co**
2. En el buscador de arriba escribe: **`Hunyuan3D-2mv`**
3. En los resultados, filtra por la pestaña **Spaces** (no *Models*)
4. Abre el que sea de **tencent**

> ⚠️ **El error típico:** entrar en la web comercial de Hunyuan o Tripo, donde solo ves "texto a 3D". El multi-foto está únicamente en el Space de HuggingFace.

**Si el Space está caído o con mucha cola** (pasa a menudo): en la misma búsqueda verás copias del Space hechas por otros usuarios. Funcionan igual. También puedes pulsar el botón de los tres puntos → *Duplicate this Space* para tener tu propia copia gratuita.

---

## PASO 2 · Cambiar a la pestaña MultiView

Al abrir el Space verás dos pestañas encima de la zona de subida:

```
[ Image Prompt ]   [ MultiView Prompt ]
      ▲ activa por defecto      ▲ PULSA AQUÍ
```

**Sólo cuando pulses "MultiView Prompt"** aparecerán las cuatro casillas:

```
┌──────────┐  ┌──────────┐
│  Front   │  │   Back   │
└──────────┘  └──────────┘
┌──────────┐  ┌──────────┐
│   Left   │  │  Right   │
└──────────┘  └──────────┘
```

---

## PASO 3 · Colocar cada foto en su casilla

Abre la carpeta del modelo, por ejemplo `referencias-3d/r34/`, y arrastra:

| Casilla | Fichero | Obligatorio |
|---|---|---|
| **Front** | `r34-tresc-frontal.webp` | Sí |
| **Back** | `r34-tresc-trasera.webp` | Sí |
| **Left** | `r34-lateral.webp` | Sí |
| Right | *(vacía)* | No |

> **Cuidado con el orden.** Si pones la lateral en "Front", la IA entiende que el coche mira de lado y la malla sale deformada.

---

## PASO 4 · Ajustes antes de generar

Si el Space los muestra, pon:

| Ajuste | Valor | Por qué |
|---|---|---|
| `octree_resolution` | **380** | Más detalle en la malla |
| `Remove background` | **activado** | Recorta el coche del fondo blanco |
| `num_inference_steps` | 30-50 | Más pasos, más calidad |
| `seed` | cualquiera | Anótalo si te gusta el resultado |

Pulsa **Gen Shape**. Tarda de 1 a 3 minutos según la cola.

---

## PASO 5 · Descargar

Cuando termine verás el modelo girando en 3D. Descarga el **GLB** (lleva el color incluido).

Guárdalo como `r34.glb`, `r32.glb`, etc. — el nombre importa para el siguiente paso.

---

## Y después

Los GLB **no se pueden mandar todavía al proveedor**: hay que escalarlos a 70 mm, vaciarlos y ponerles el agujero de drenaje. Eso lo hace un script automático de Blender, sin que abras el programa.

---

## ⚠️ Licencias: míralo antes de vender

| Herramienta | ¿Puedes vender lo que salga? |
|---|---|
| **TRELLIS.2** | ✅ MIT, sin restricciones |
| **Hunyuan3D** | ⚠️ Licencia Tencent Community — **léela** |
| **Meshy** gratis | ⚠️ CC BY 4.0, obliga a atribuir |
| **Tripo** gratis | ❌ Prohíbe uso comercial |

Si la licencia de Hunyuan te preocupa, **TRELLIS.2 es MIT** y no tiene letra pequeña. Solo admite una foto (usa la ¾ frontal), así que la malla sale algo peor, pero legalmente estás tranquilo.

---

## Orden recomendado

1. **Solo el R34.** Tiene 5 vistas y es el mejor caso.
2. Míralo en 3D. ¿La malla es decente?
3. Si sí → sigue con los 14 restantes (unas 2 tardes)
4. Si no → prueba TRELLIS.2 o un freelance de Fiverr (20-60 €/modelo)

**No hagas los 15 de golpe.** Con el primero sabrás si el proceso te sirve.
