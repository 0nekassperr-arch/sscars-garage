# CÓMO HACER LOS MODELOS 3D — paso a paso real

No vas a modelar nada a mano. Tus fotos **son** el modelo. Esto es solo convertirlas.

Tiempo por figura: **20-30 min la primera, 8-10 min cuando cojas el ritmo.**

---

## Ruta A — La rápida (recomendada para empezar)

### Paso 1 · Generar la malla (5 min, gratis)

1. Entra en **huggingface.co** y busca el Space **Hunyuan3D-2** (o **TRELLIS**). Son gratis y sin instalar nada.
2. Sube las imágenes de `produccion/referencias/r34/`. Si el Space admite varias vistas, sube las 5. Si solo admite una, usa `r34-tresc-frontal.webp`.
3. Genera y descarga el **GLB** (lleva color incluido).

> Alternativa más cómoda: **Tripo3D** o **Meshy**, con créditos gratis al mes e interfaz más amable. Cuando se acaben, vuelves a HuggingFace.

### Paso 2 · Preparar para imprimir (10 min, Blender gratis)

Instala Blender y activa *Edit → Preferences → Add-ons → 3D Print Toolbox*.

| Acción | Cómo | Por qué |
|---|---|---|
| Importar | File → Import → glTF (.glb) | — |
| **Escalar a 70 mm** | Tecla `N` → Dimensiones → eje del largo = `0.07 m` | Es el tamaño que promete la web |
| **Comprobar** | 3D Print Toolbox → *Check All* | Detecta agujeros y caras invertidas |
| **Reparar** | *Make Manifold* | Sin esto el proveedor rechaza el fichero |
| **Vaciar** | Modificador *Solidify* → grosor `-2 mm` → *Even Thickness* | Ahorra ~60% de material = ~60% del coste |
| **Agujero de drenaje** | Cilindro de 4 mm en los bajos → modificador *Boolean → Difference* | Sin él la resina queda atrapada y la pieza revienta |
| **Exportar** | File → Export → **.3mf** (o .obj con *Materials* marcado) | ⚠️ **STL NO guarda color** |

### Paso 3 · Verificar antes de pagar (2 min, gratis)

Abre el fichero en **PrusaSlicer**. Te dice dos cosas:
- Si es **estanco** (si no, vuelve al *Make Manifold*)
- **Cuántos cm³ consume** ← este número es tu coste real. Apúntalo.

### Paso 4 · Nombrar y subir

`r34.3mf`, `r34-gold.3mf`, `r32.3mf`… exactamente los slugs del código.
Súbelos a Drive/S3 con enlace público y pon esa base en `STL_BASE_URL` y `MODEL_EXT=3mf`.

---

## Ruta B — Que lo haga el proveedor (si la A se te atraganta)

Muchas fábricas chinas **modelan gratis si les encargas producción**. Les mandas las 5 fotos + la ficha técnica y ellos te devuelven el 3D y una muestra.

- **Ventaja:** cero trabajo técnico y calidad de fábrica.
- **Pega:** MOQ de 300-500 uds por modelo y 2.000-4.000 € de entrada.
- **Ojo:** exige por contrato que **el fichero 3D sea tuyo**. Si no, quedas atado a ellos para siempre.

---

## Ruta C — Freelance (el punto medio)

Fiverr/Upwork: un modelador de art toys cobra **20-60 € por figura**. Los 15 salen por 300-900 €.
Merece la pena si la Ruta A te da mallas malas y no quieres pelearte con Blender.

---

## ⚠️ Los 4 errores que arruinan una tirada

1. **Mandar STL esperando color.** STL es solo geometría. Para color: **3MF, OBJ+MTL o GLB**.
2. **No vaciar la pieza.** Maciza cuesta 3-4 veces más. En 500 unidades son cientos de euros tirados.
3. **Olvidar el agujero de drenaje.** Rechazo garantizado en resina.
4. **Hacer los 15 antes de tener una muestra en la mano.** Haz **uno**, tócalo, y entonces decide.

---

## Orden correcto

```
1. R34 con la Ruta A                    ← empieza aquí, hoy
2. Pedir presupuesto a 3 proveedores con la ficha técnica
3. Pedir 1 muestra física del R34
4. Tenerla en la mano y decidir
5. Solo entonces, los 14 restantes + los 15 gold
```

Si la muestra sale mal, has perdido 30 € y una semana. Si haces los 15 primero, pierdes semanas de trabajo.
