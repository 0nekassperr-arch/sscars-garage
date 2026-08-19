# FLUJO 100% GRATIS — de la foto al fichero de impresión, los 15 modelos

Coste total en herramientas: **0 €**. Solo tu tiempo.
Ritmo real: **20-25 min el primer modelo, 8-10 min a partir del tercero.** Los 15 en 2-3 tardes.

---

## Las herramientas (todas gratis, ninguna de pago)

| Paso | Herramienta | Coste | Instalar |
|---|---|---|---|
| Foto → malla 3D | **Hunyuan3D-2** o **TRELLIS** en huggingface.co | 0 € | No, va en el navegador |
| Reparar y vaciar | **Blender** + add-on *3D Print Toolbox* | 0 € | Sí |
| Verificar | **PrusaSlicer** | 0 € | Sí |
| Alojar los ficheros | **Google Drive** con enlace público | 0 € | No |

> Alternativas si HuggingFace va saturado: **Tripo3D** y **Meshy** dan créditos gratis cada mes. Cuando se agotan, vuelves a HuggingFace, que no caduca.

---

## El material de entrada ya lo tienes

En `produccion/referencias/` hay una carpeta por modelo. Cuantas más vistas le des a la IA, mejor sale la malla:

| Vista | Para qué sirve | Estado |
|---|---|---|
| ¾ frontal | Base principal | ✅ los 15 |
| ¾ trasera | Cierra la parte de atrás | ✅ los 15 |
| **Lateral** | Define la silueta, la más útil de las tres extra | 🔄 en curso |
| Frontal recta | Simetría | ✅ solo R34 (ejemplo) |
| Cenital | Techo y contorno | ✅ solo R34 (ejemplo) |

Con **¾ frontal + ¾ trasera + lateral** ya sale una malla buena. Las cinco vistas del R34 son el ejemplo de máxima calidad.

---

## Proceso por modelo

### 1 · Malla (5 min)
HuggingFace → Space *Hunyuan3D-2* → subir las vistas del modelo → generar → descargar **GLB**.

### 2 · Blender (10 min)
```
Importar GLB
Tecla N → Dimensiones → largo = 0.07 m        (70 mm)
3D Print Toolbox → Check All → Make Manifold  (repara agujeros)
Modificador Solidify → grosor -2 mm → Even Thickness   (vaciado)
Cilindro 4 mm en los bajos → Boolean → Difference      (drenaje)
Exportar → .3mf                                (¡NO .stl, no lleva color!)
```

### 3 · Verificar (2 min)
PrusaSlicer → abrir → ¿estanco? ¿cuántos cm³? **Apunta el volumen, es tu coste real.**

### 4 · Nombrar
`r34.3mf`, `r32.3mf`, `350z.3mf`, `supra.3mf`, `ae86.3mf`, `mr2.3mf`, `rx7.3mf`, `nsx.3mf`, `civic.3mf`, `s2000.3mf`, `evo.3mf`, `eclipse.3mf`, `3000gt.3mf`, `wrc.3mf`, `lfa.3mf`
Y las doradas: `r34-gold.3mf`, etc. (misma geometría, solo cambia el color en la ficha del proveedor).

---

## Hoja de control

| # | Modelo | slug | Malla | Blender | Verificado | Volumen cm³ |
|---|---|---|---|---|---|---|
| 01 | Ronin | `r34` | ☐ | ☐ | ☐ | |
| 02 | Ogro | `r32` | ☐ | ☐ | ☐ | |
| 03 | Zeta | `350z` | ☐ | ☐ | ☐ | |
| 04 | Naranja | `supra` | ☐ | ☐ | ☐ | |
| 05 | Tofu | `ae86` | ☐ | ☐ | ☐ | |
| 06 | Mini Exótico | `mr2` | ☐ | ☐ | ☐ | |
| 07 | Rotativo | `rx7` | ☐ | ☐ | ☐ | |
| 08 | Samurái | `nsx` | ☐ | ☐ | ☐ | |
| 09 | Tipo R | `civic` | ☐ | ☐ | ☐ | |
| 10 | VTEC | `s2000` | ☐ | ☐ | ☐ | |
| 11 | Evolucionado | `evo` | ☐ | ☐ | ☐ | |
| 12 | Verde Fosforito | `eclipse` | ☐ | ☐ | ☐ | |
| 13 | Gran Turismo | `3000gt` | ☐ | ☐ | ☐ | |
| 14 | 22B | `wrc` | ☐ | ☐ | ☐ | |
| 15 | Ángel | `lfa` | ☐ | ☐ | ☐ | |

**Empieza por el 01 y para.** Con ese único fichero pide presupuesto y una muestra física. Cuando la tengas en la mano y te convenza, haces los 14 restantes.

---

## Conectar con la tienda

Cuando los tengas subidos a Drive con enlace público, en Vercel:

```
STL_BASE_URL = https://tu-carpeta-publica
MODEL_EXT    = 3mf
```

El código ya lo soporta. A partir de ahí, cada pedido pagado dispara el envío del fichero correcto al fabricante, sin que toques nada.

---

## Los 4 errores que arruinan una tirada

1. **Mandar STL esperando color** → STL solo guarda geometría. Usa **3MF**.
2. **No vaciar** → maciza cuesta 3-4 veces más. En 500 uds son cientos de euros.
3. **Sin agujero de drenaje** → rechazo automático en resina.
4. **Hacer los 15 antes de tocar una muestra** → si el proveedor falla, tiras semanas de trabajo.
