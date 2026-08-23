# GUÍA DE LANZAMIENTO — SSCARS Garage Collections

Checklist ordenado de lo que queda. **Todo lo técnico ya está montado y testeado**;
esto es la ejecución. Fuente de verdad: https://sscarsgarage.vercel.app · repo
`0nekassperr-arch/sscars-garage` (main) · plan detallado en `PLAN_DE_ACCION.md`.

---

## 1 · Modelos 3D — Tripo multivista (el pipeline definitivo)

- [ ] Prueba el R34: https://www.tripo3d.ai → **Create → Image to Model** → sube las 4
      vistas de `produccion/tripo-r34/` (`1-front`, `2-back`, `3-left`, `4-right`) → descarga el **GLB**.
- [ ] Míralo **CON LUPA**: ¿llantas con 5 radios limpias?, ¿trasera sin masa fundida?,
      ¿detalle y cantos (no plastilina)?
- [ ] **Pásame la captura o el GLB** → yo lo evalúo.
- [ ] Si el R34 sale nítido → repite con los otros 14 usando la tabla de
      `produccion/GUIA_TRIPO.md` (archivos exactos por slug).
- ⚠️ Licencia: plan de pago de Tripo (~0,5-2 €/modelo) para uso comercial. Anota el
  plan de cada modelo para el registro de licencias.

## 2 · Blender — 1 comando por modelo (automático)

```bash
blender --background --python produccion/blender/preparar_figura.py -- {slug}.glb {slug} 70
```

- [ ] Salida: `{slug}.stl`, `{slug}.obj + .mtl`, `{slug}.3mf` (70 mm, ahuecado 2 mm,
      drenaje 4 mm, piezas sueltas limpiadas).
- [ ] Verifica el primero en **PrusaSlicer** (¿estanco? ¿cuántos cm³?) antes de gastar.

## 3 · Proveedor POD (la decisión clave de costes)

Elige el tipo de figura según el margen (precios de la web: 24,95 / 69,95 / 129,95 / 669,95 €):

**A. Resina MONO (JLC3DP) — figura de UN color por modelo (estilo Funko)**
- Coste: **~4-5 € pieza + ~7 € envío** → margen ≈ **13 €** (1 caja) / **48 €** (pack 3) /
  **93 €** (pack 6) / **590 €** (completo). ✅ Cuadra con el precio.
- La web debe mostrar la figura de un solo color por modelo (se actualiza).
- API: la Ordering API de JLC3DP acepta **STL/OBJ/3MF** pero hay que **solicitarla**
  (jlc3dp.com/help/article/jlc3dp-api). Hasta entonces: **cumplimiento MANUAL**
  (panel `/api/admin` → subes el 3MF → envías) — perfecto para lanzar.
- [ ] Si vas con mono → yo ajusto la web y dejamos `FABRICANTE=jlc3dp`.

**B. Full-color premium — solo viable con fábrica china a escala**
- POD full-color: 15-35 €/ud → **no cuadra** a 24,95 € (solo en el pack de 669,95 €).
- China (Alibaba): 1,5-3 €/ud pintada, MOQ 300-500/modelo → cuando haya volumen validado.
- [ ] Si eliges esta vía → **Printeers** o **Marketiger3D** para la preventa del pack completo.

> Regla: pide presupuesto con `produccion/EMAIL_RFQ.md` adjuntando el 3MF + fotos, y
> **pide 1 muestra física** antes de firmar nada.

## 4 · Stripe (los cobros)

- [ ] Dashboard (dashboard.stripe.com) → **Catálogo de productos** → **Añadir producto** →
      4 precios de **pago único**, moneda **EUR**:
      | Producto | Precio |
      |---|---|
      | 1 Caja | **24,95 €** |
      | Pack 3 Cajas | **69,95 €** |
      | Pack 6 Cajas | **129,95 €** |
      | Colección Completa | **669,95 €** |
- [ ] Copia los 4 IDs `price_...` y **PÁSAMELOS** → yo los configuro en Vercel.
- [ ] Webhook: endpoint `https://sscarsgarage.vercel.app/api/order`, evento
      `checkout.session.completed`, firma `whsec_...`.

## 5 · Variables de entorno en Vercel (yo las pongo si me pasas los valores)

| Grupo | Variables |
|---|---|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BOX1`, `STRIPE_PRICE_BOX3`, `STRIPE_PRICE_BOX6`, `STRIPE_PRICE_FULL` |
| POD | `FABRICANTE`, `JLC_API_KEY`, `STL_BASE_URL`, `MODEL_EXT=3mf` |
| Persistencia | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Avisos | `RESEND_API_KEY`, `ALERT_EMAIL`, `FROM_EMAIL` |
| Admin | `ADMIN_KEY` (cadena larga aleatoria) |

Plantilla completa en `.env.example`. Sin Stripe la web funciona pero no cobra; sin POD
cae en modo manual (te avisa por email).

## 6 · Marketing automático (coste 0 €)

- [ ] Cuenta Instagram **Professional** + app en developers.facebook.com (pasos en
      `marketing/README.md`).
- [ ] Pega `marketing/autopost.gs` en script.google.com → `setupTrigger()` →
      **1 post/día** ciclando las 15 historias con caption de Gemini (tier gratis).

## 7 · Lanzamiento

- [ ] Prueba de compra real con la tarjeta de test **4242 4242 4242 4242**.
- [ ] **Rota los tokens** de GitHub y Vercel que compartiste en el chat (higiene).
- [ ] (Pendiente de tus datos) enlaces de redes sociales + datos legales en
      `public/legal/` antes de anunciar.
- [ ] Publica el primer post/Reel con la figura del R34.
