# PLAN DE ACCIÓN — SSCARS Garage (estado y siguientes pasos)

Mapa único de "dónde estamos y qué toca ahora". Fuente de verdad: este repositorio
(`main`) + despliegue en **https://sscarsgarage.vercel.app**.

---

## Dónde estamos

| Bloque | Estado |
|---|---|
| **Web** | Landing V6 completa: 15 figuras JDM, carrito, checkout Stripe, sorteo sin repetidos + Gold 1/500. Código en `public/index.html` + backend en `api/`. |
| **GitHub** | `0nekassperr-arch/sscars-garage` — **ya tiene la versión correcta** (recuperada). |
| **Vercel** | Proyecto `sscarsgarage` → `sscarsgarage.vercel.app` (despliegue por token, **sin** integración GitHub). |
| **3D** | Piloto R34 en curso. Hunyuan3D-2mv descartado (derrite la malla chibi). Las 4 vistas normalizadas están listas en `produccion/tripo-r34/`. |
| **Pagos** | Código listo, cuentas **sin crear** (Stripe, Upstash, Resend, JLC3DP). |

---

## 1 · Remates de la web (rápidos, pendientes de tus datos)

- [ ] **Redes sociales**: poner tus URLs reales de Instagram, Threads, TikTok y YouTube
      (hoy están en `href="#"` en el footer de `public/index.html`).
- [ ] **Datos legales**: sustituir `[NOMBRE O RAZÓN SOCIAL]`, `[NIF]`, `[DIRECCIÓN]`,
      `[EMAIL]` y el `[plazo de entrega]` en `public/legal/*.html` antes de vender.
- [x] Hecho: canonical, OG, JSON-LD, `sitemap.xml` y `robots.txt` ya apuntan a
      `sscarsgarage.vercel.app` (antes apuntaban al dominio viejo).

---

## 2 · Modelos 3D — PILOTO R34 (lo haces tú en el navegador; yo te guío)

**Decisión tomada: TRELLIS con UNA sola imagen quedó DESCARTADO** — dio silueta reconocible
pero demasiado blanda/derretida (llantas deformadas, trasera fundida, sin detalle). El
pipeline es **Tripo o Meshy en modo multivista** (4 vistas) — nítido y fiel.

**Acción concreta: prueba el R34 en Tripo3D.**

1. Abre https://www.tripo3d.ai → **Create** → **Image to Model**.
2. En "Generación por múltiples vistas" sube:
   - Front  → `produccion/tripo-r34/1-front.webp`
   - Back   → `produccion/tripo-r34/2-back.webp`
   - Left   → `produccion/tripo-r34/3-left.webp`
   - Right  → `produccion/tripo-r34/4-right.webp`
3. Genera y descarga el **GLB**. (Alternativa: Meshy, mismo orden.)

**Cómo juzgar (con lupa):** ¿silueta reconocible? / ¿llantas con 5 radios limpias (no blandas)? /
¿trasera limpia sin masa fundida? / ¿alerón con forma? / ¿hay detalle y cantos (no plastilina)?
Si el R34 sale nítido → repetimos con los otros 14 usando sus vistas de
`produccion/referencias/{slug}/` (`*-tresc-frontal`, `*-tresc-trasera`, `*-lateral`, `*-lateral-derecha`).

> ⚠️ Licencia comercial: los créditos gratis de Tripo/Meshy son de uso NO comercial —
> necesitarás un plan de pago (~0,5-2 €/modelo) para vender. Detalle en `produccion/GUIA_TRIPO.md`.

- Flujo completo (Blender, vaciado, drenaje, exportar 3MF): `produccion/EMPIEZA_AQUI.md`
  y `produccion/FLUJO_GRATIS.md`.

> 🤖 **Automatización opcional (Blender headless):** cuando tengas el GLB bueno, el
> script `produccion/blender/preparar_figura.py` hace solo el escalado a 70 mm, la
> reparación manifold, el ahuecado a 2 mm, el agujero de drenaje de 4 mm y exporta
> STL + OBJ/MTL + 3MF:
> `blender --background --python preparar_figura.py -- modelo.glb r34 70`
> Si prefieres hacerlo a mano (más control visual), sigue `EMPIEZA_AQUI.md` paso a paso.

> ⚠️ Licencia comercial: TRELLIS.2 = MIT (ok). Hunyuan/Tripo/Meshy gratis = leer
> condiciones antes de vender (tabla en `produccion/FLUJO_GRATIS.md`).

---

## 3 · Proveedor print-on-demand (POD)

El código de `api/order.js` ya está preparado para mandar cada pedido pagado a una
API de fabricación (`JLC_API_KEY` + `STL_BASE_URL` + `MODEL_EXT`). Mientras no tengas
proveedor, **cae en modo manual** y te manda el pedido por email.

Opciones (coste vs. color vs. mínimo de pedido), resumidas de `GUIA_3D_Y_PRODUCCION.md`:

| Vía | Coste/ud | Color | MOQ | Para qué |
|---|---|---|---|---|
| POD a color bajo demanda (Shapeways/PolyJet) | 15-35 € | ✅ | 0 | Arrancar sin stock, margen justo |
| Resina mono (JLC3DP) + pintado | 1-2 € | ❌ | 0 | Barato pero hay que pintar |
| Master + molde silicona + colada | 2-4 € | ✅ | 100+ | Art toys de calidad |
| Fábrica china (Alibaba) | 1,5-3 € | ✅ | 300-500 | El negocio real a escala |

**Proveedores con API + color (candidatos reales para la automatización):**

- **Printeers** (Países Bajos) — API + impresión a color, dentro de la UE → envío a
  España sin aduanas. https://printeers.com/integrations/api
- **Marketiger3D** (Países Bajos) — color + API. https://marketiger3d.com
- **Shapeways** — color MJF de autoservicio + API para desarrolladores (EE. UU., envía
  a la UE). https://developers.shapeways.com/api-reference
- **JLC3DP** — ya integrado en `api/order.js`, pero resina **mono** (sin color real);
  sirve si decides pintar tú o encargas el pintado aparte.

> El código `api/order.js` hoy llama a la API de JLC3DP. Cuando elijas proveedor, adapto
> esa función a su API (URL, cabeceras y formato del pedido) y configuramos las variables.

Recomendación: arranca en POD a color bajo demanda (preventa, cero stock) y, con
~100-200 pedidos cobrados, salta a fábrica china. Plantillas para pedir presupuesto en
`produccion/EMAIL_RFQ.md`.

---

## 4 · Pagos y puesta en marcha

Cuentas a crear (gratis, ~5 min cada una) y variables a pegar en Vercel
(Project → Settings → Environment Variables):

1. **Stripe** → 4 precios de pago único (24,95 € / packs) y copiar:
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BOX1`, `STRIPE_PRICE_BOX3`,
   `STRIPE_PRICE_BOX6`, `STRIPE_PRICE_FULL`.
2. **Stripe Webhook** → endpoint `https://sscarsgarage.vercel.app/api/order`,
   evento `checkout.session.completed`.
3. **Upstash** (idempotencia) → `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
4. **Resend** (avisos por email) → `RESEND_API_KEY`, `ALERT_EMAIL`, `FROM_EMAIL`.
5. **JLC3DP** (o tu POD) → `FABRICANTE` (proveedor a usar), `JLC_API_KEY`, `STL_BASE_URL`, `MODEL_EXT=3mf`.
   El código ya trae un adaptador por proveedor en `api/fabricacion.js`; añadir otro es copiar
   un bloque y elegirlo con `FABRICANTE`.
6. **Admin** → `ADMIN_KEY` (cadena larga aleatoria) para `/api/admin?key=…`.

Guía de referencia: `SSCARS_GARAGE_FINAL.md` (§4 Deploy) y `AUDITORIA.md` (§4 checklist).

---

## 5 · Marketing automatizado (fase futura)

Idea en cartera: publicar a diario en Instagram/Threads con IA — **Antigravity agent**
de Google AI Studio (https://ai.google.dev/gemini-api/docs/antigravity-agent) + modelos
gratis de AI Studio — para conseguir las primeras ventas orgánicas y luego escalar con
ads. Encaja con la "Fase 5" de `AUDITORIA.md` (contenido Threads + IA + Vercel Cron).
Se monta **después** de que la tienda cobre y haya stock real.

---

## Cómo redesplegar tú (sin depender de mí)

```bash
# 1. Baja el último código
git pull origin main

# 2. Despliega a producción (necesitas el token de Vercel)
npx vercel --prod --yes --token <TU_TOKEN>

# o, si prefieres GitHub → Vercel:
#   Vercel → Import Project → selecciona 0nekassperr-arch/sscars-garage → Framework: Other
```
