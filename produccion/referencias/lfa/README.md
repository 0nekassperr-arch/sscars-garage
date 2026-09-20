# #15 · La Voz del V10 (LFA)

> **Modelo Real:** Lexus LFA (2010)  
> **Ubicación de Referencias:** `produccion/referencias/lfa/`  
> **Total de Vistas Disponibles:** 4 archivos

---

## 📸 1. REFERENCIAS PRINCIPALES PARA RECONSTRUCCIÓN 3D (PRIMARY REFS)

Utilizadas para los 4 slots de generación multivista en Tripo3D / Meshy:

1. **Front (1-front):** `lfa-tresc-frontal.webp (1100x733)`
2. **Left (2-left):** `lfa-lateral.webp (1100x733)`
3. **Back (3-back):** `lfa-tresc-trasera.webp (1100x733)` — actualizada (rear v3: mira a la derecha como el resto de la colección, emblema "L" eliminado, altura de suspensión baja como el frontal)
4. **Right (4-right):** `lfa-lateral-derecha.webp (1100x733)`

---

## 🔍 2. REFERENCIAS SECUNDARIAS Y PERSPECTIVA (SECONDARY REFS)

_Todas las vistas disponibles forman parte del set principal._

---

## 📝 3. OBSERVACIONES CLAVE PARA MODELADO Y SEGMENTACIÓN

- **Identidad Geométrica:** Blanco perla Whitest White, triple salida de escape triangular central trasera en triángulo invertido (2 arriba, 1 abajo) integrada en difusor negro mate/carbono, calandras de entrada de aire del parachoques delantero en negro, alerón activo retraído y tomas de aire traseras en montante C. Trasera con paneles de rejilla negra en las esquinas del parachoques y ópticas rojas de carcasa oscura.
- **Postura (crítico):** altura de suspensión **baja** en todas las vistas — neumático encajado en el paso de rueda y talonera cerca del suelo. Mantener la misma altura de la vista frontal en cualquier vista nueva.
- **Fondo y Calibración:** Fondo blanco neutro continuo con sombra suave de contacto.
- **Flujo de Producción:** `produccion/referencias/lfa/` ➔ `Tripo3D` ➔ `lfa_raw.glb` ➔ `Blender Pipeline` ➔ `lfa_master`.
