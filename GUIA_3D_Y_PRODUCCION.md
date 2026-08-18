# GUÍA 3D + PRODUCCIÓN — de la foto a la figura en la mano

Esto responde a "no tengo ni idea de 3D". No hace falta que la tengas: el flujo es **foto → IA → limpieza → fichero de impresión**. Todo con herramientas gratuitas.

---

## 0. Lo primero, porque cambia todo: STL no lleva color

| Formato | ¿Guarda color? | Cuándo se usa |
|---|---|---|
| **STL** | ❌ No | Impresión en un solo color (resina gris, luego pintada) |
| **3MF** | ✅ Sí | Estándar moderno, el que piden las impresoras a color |
| **OBJ + MTL + PNG** | ✅ Sí (textura) | Lo que exporta la IA, lo que aceptan los servicios full-color |
| **GLB** | ✅ Sí | Formato web, fácil de convertir a los anteriores |

La web promete **"resina a color"**. Por tanto tus ficheros finales **no pueden ser STL**: tienen que ser **OBJ+MTL o 3MF**. El código ya lo contempla con la variable `MODEL_EXT`.

---

## 1. Generar el 3D a partir de tus fotos (gratis)

Tienes una ventaja enorme: **ya tienes delantera y trasera de cada figura**. Los modelos actuales aceptan varias vistas y eso multiplica la fidelidad.

**Opción A — Hunyuan3D 2.0 (Tencent) · 100 % gratis, sin límite práctico**
1. Entra en huggingface.co y busca el Space *Hunyuan3D-2*.
2. Sube `r34-front.webp`. En modo multi-view, sube también `r34-rear.webp`.
3. Genera. Descarga el **GLB** (lleva color).

**Opción B — TRELLIS (Microsoft) · gratis en HuggingFace**
Mejor topología en formas duras como un coche. Mismo procedimiento.

**Opción C — Tripo3D o Meshy · más cómodo, crédito gratuito mensual**
Interfaz más amable, exportación directa a OBJ/STL. Cuando se acaban los créditos, vuelves a la A.

> Cuenta unos 3-6 minutos por modelo. Con 15 modelos son **menos de dos horas** de trabajo total.

## 2. Preparar el modelo para imprimir (Blender, gratis)

Instala **Blender** y activa el add-on *3D Print Toolbox* (Edit → Preferences → Add-ons).

Por cada figura:
1. **Importar** el GLB/OBJ.
2. **Escalar** a 70 mm de largo (N → dimensiones → eje Y = 0,07 m).
3. **Comprobar** con 3D Print Toolbox → *Check All*. Si salen "non-manifold", pulsa *Make Manifold*.
4. **Vaciar** (ahorra el 60 % de resina): modificador *Solidify* → grosor **-2 mm**, marcar *Even Thickness*.
5. **Agujero de drenaje**: un cilindro de 4 mm en la parte baja del chasis → modificador *Boolean* → *Difference*. Sin esto la resina queda atrapada y la pieza revienta o la fábrica la rechaza.
6. **Exportar** a `3MF` u `OBJ` (marcando *Materials* para conservar la textura).
7. Nombrar exactamente como espera el código: `r34.3mf`, `r34-gold.3mf`, `r32.3mf`…

> Alternativa sin Blender: **Microsoft 3D Builder** (Windows, gratis) hace *Simplify* + *Hollow* + agujeros en tres clics. Menos control, pero sirve.

## 3. Comprobar antes de gastar dinero

Abre el fichero en **PrusaSlicer** (gratis): te dice si es estanco y **cuántos cm³ de material** consume. Ese volumen es lo que determina el precio real de fabricación. Hazlo con los 15 antes de publicar precios definitivos.

---

## 4. Cómo se fabrica de verdad (lo importante)

Aquí tengo que ser franco contigo, porque afecta a tu margen:

| Vía | Coste/unidad | Color | Stock | Realidad |
|---|---|---|---|---|
| **A. Impresión a color bajo demanda** (Shapeways full-color, PolyJet) | 15-35 € | ✅ Sí | Cero | Con 29,90 € el margen se queda en nada. Sólo viable para el pack de 699 €. |
| **B. Resina mono bajo demanda** (JLC3DP) + pintado | 1-2 € impresión | ❌ Hay que pintar | Cero | Barato, pero pintar 15 modelos a mano no escala y contradice el texto de la web. |
| **C. Master 3D + molde de silicona + colada de resina** | 2-4 € a partir de 100 uds | ✅ Con spray | Sí | Lo que hacen los art toys pequeños. Requiere trabajo manual o taller. |
| **D. Fábrica china (Alibaba), resina o PVC pintado** | 1,5-3 € con MOQ 300-500/modelo | ✅ Sí, de serie | Sí | Es como se fabrican los blind box reales. Calidad muy superior. Inversión inicial ~2.000-4.000 €. |

**Mi recomendación de secuencia, para no arriesgar dinero:**

1. **Lanza con la vía A o B en modo bajo demanda** limitando la campaña a los packs que dejan margen, y usa el contador como lo que es: una preventa. Cero stock, cero riesgo.
2. Cuando acumules ~100-200 pedidos, pasas a la **vía D** con esos ingresos ya cobrados. El coste por unidad se desploma y ahí es donde está el negocio de verdad.
3. La vía C es el punto medio si prefieres controlar tú la calidad desde el principio.

⚠️ **Aviso legal sobre la fabricación**: encargar réplicas reconocibles de coches con marca a una fábrica es donde más riesgo hay de que te paren un envío en aduanas. Las figuras deben ir **sin logos, sin nombres de marca y sin matrículas reales** — como ya están. Mantenlo así también en la caja y en el material impreso.

---

## 5. Checklist antes de encender la publicidad

- [ ] 15 modelos generados y verificados como estancos
- [ ] Los 15 vaciados a 2 mm con agujero de drenaje
- [ ] Volumen medido y coste real por figura calculado
- [ ] 1 unidad de prueba pedida y recibida en mano (**nunca vendas algo que no has tocado**)
- [ ] Foto real de esa unidad publicada en la web (sustituye a los renders y multiplica la confianza)
- [ ] Versiones `-gold` de los 15
- [ ] Ficheros subidos y `STL_BASE_URL` + `MODEL_EXT` configurados
