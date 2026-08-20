# EMPIEZA AQUÍ — tu primer modelo 3D en 25 minutos, gratis

Todo el material ya está preparado. Esto es solo seguir pasos.

---

## PASO 1 · Abrir el generador correcto (2 min)

Entra en **huggingface.co** y busca en el buscador de arriba:

```
Hunyuan3D-2mv
```

Filtra por **Spaces** (no por Models). Entra en el de `tencent`.

> **Aquí es donde falla todo el mundo:** el Space se abre por defecto en la pestaña **"Image Prompt"**, que solo admite una foto. Tienes que pinchar arriba en la pestaña **"MultiView Prompt"**. Solo entonces aparecen las cuatro casillas.

Si el Space oficial está caído o con cola larga (pasa a menudo), busca `Hunyuan3D-2mv` y verás copias del mismo hechas por otros usuarios. Funcionan igual.

---

## PASO 2 · Subir las tres fotos (1 min)

Abre en tu ordenador la carpeta `produccion/referencias/r34/` y arrastra:

| Casilla del Space | Fichero |
|---|---|
| **Front** | `r34-tresc-frontal.webp` |
| **Back** | `r34-tresc-trasera.webp` |
| **Left** | `r34-lateral.webp` |
| Right | *(déjala vacía)* |

Ajustes recomendados si los ves:
- `octree_resolution` → **380** (más detalle)
- `remove background` → **activado**

Pulsa **Gen Shape**. Tarda de 1 a 3 minutos.

Descarga el **GLB**.

---

## PASO 3 · Blender: dejarlo imprimible (10 min)

Instala Blender (gratis) y activa el add-on: *Edit → Preferences → Add-ons → buscar "3D Print" → marcar **3D-Print Toolbox***.

```
1. File → Import → glTF 2.0 (.glb)          importar el modelo
2. Tecla N → pestaña Item → Dimensiones      poner el eje del LARGO en 0.07 m  (70 mm)
3. Barra lateral 3D-Print → Check All        detecta errores
4. Si hay errores → Make Manifold            los repara
5. Modificador Solidify                      grosor -2 mm, marcar Even Thickness   (vaciado)
6. Añadir cilindro Ø4 mm en los bajos
   → Modificador Boolean → Difference        agujero de drenaje
7. File → Export → 3MF                       ¡NO STL, no guarda color!
```

Guárdalo como `r34.3mf`.

---

## PASO 4 · Verificar antes de gastar un euro (2 min)

Abre `r34.3mf` en **PrusaSlicer** (gratis):

- ¿Avisa de que no es estanco? → vuelve al paso 4 de Blender
- Mira el **volumen en cm³** y apúntalo → ese número es tu coste real de material

---

## PASO 5 · Pedir presupuesto (10 min)

Con ese único fichero, abre `EMAIL_RFQ.md` y manda los tres correos, adjuntando:
- El `r34.3mf`
- Las fotos de `produccion/referencias/r34/`
- El `FICHA_TECNICA_PROVEEDOR.md`

**Pide una muestra física de una unidad.** No encargues producción hasta tenerla en la mano.

---

## 🛑 Para aquí

No hagas los otros 14 todavía. Con el R34 vas a descubrir si la calidad de malla te vale, si Blender se te da bien y qué te cobra un proveedor de verdad. Esa información cambia todas las decisiones siguientes.

Cuando tengas la muestra y te guste, repites el proceso 14 veces. Son unas dos tardes.

---

## Los otros 14 (para cuando llegue el momento)

Mismo proceso. Nombres exactos de salida:

```
r34.3mf    r32.3mf     350z.3mf    supra.3mf   ae86.3mf
mr2.3mf    rx7.3mf     nsx.3mf     civic.3mf   s2000.3mf
evo.3mf    eclipse.3mf 3000gt.3mf  wrc.3mf     lfa.3mf
```

Las doradas **no requieren trabajo extra**: misma geometría, solo cambia el color que le indicas al proveedor.

Luego, en Vercel:
```
STL_BASE_URL = https://tu-carpeta-publica-de-drive
MODEL_EXT    = 3mf
```

Y a partir de ahí cada pedido pagado manda solo el fichero correcto a fabricar.

---

## Si Blender se te atraganta

Es normal, no es un programa amable. Dos salidas:

- **Microsoft 3D Builder** (Windows, gratis): hace *Simplify*, *Hollow* y agujeros en tres clics. Menos control, pero suficiente.
- **Freelance en Fiverr**: 20-60 € por figura. Tienes el anuncio ya redactado en `EMAIL_RFQ.md`, apartado C.

---

## ⚠️ Licencias: míralo antes de vender

| Herramienta | ¿Puedes vender lo que salga? |
|---|---|
| **TRELLIS.2** | ✅ MIT, sin restricciones |
| **Hunyuan3D** | ⚠️ Licencia Tencent Community — **léela** |
| **Meshy** gratis | ⚠️ CC BY 4.0, obliga a atribuir |
| **Tripo** gratis | ❌ Prohíbe uso comercial |

Si la licencia de Hunyuan te genera dudas, usa **TRELLIS.2** con la vista ¾ frontal: acepta una sola foto pero es MIT y no tiene letra pequeña.
