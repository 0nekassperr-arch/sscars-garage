# AUDITORÍA COMPLETA — SSCARS Garage Collections

Fecha: sesión actual · Alcance: `public/index.html`, `api/*`, `vercel.json`

---

## PARTE 1 · Auditoría técnica (frontend)

### Corregido en esta pasada

| # | Problema | Gravedad | Solución aplicada |
|---|----------|----------|-------------------|
| 1 | Imágenes sin `width`/`height` → saltos de maquetación (CLS) al cargar | Alta | Atributos de dimensión en todas las imágenes |
| 2 | Las fotos de producto eran `<div>` con `onclick` → invisibles para teclado y lectores de pantalla | Alta | Convertidas en `<button>` con `aria-label` |
| 3 | El carrito no bloqueaba el scroll del fondo en móvil (scroll chaining) | Alta | Contador de bloqueos `lockScroll()` compartido por modal y carrito |
| 4 | `<img src="">` en el visor → 2 peticiones fallidas a la home en cada carga | Media | Placeholder SVG en data-URI |
| 5 | Sin `canonical`, `robots.txt`, `sitemap.xml`, ni imagen OG absoluta | Media (SEO) | Añadidos los cuatro |
| 6 | Sin datos estructurados → sin resultados enriquecidos en Google | Media (SEO) | JSON-LD `Product` + `AggregateOffer` + `FAQPage` |
| 7 | El modal no gestionaba el foco ni lo devolvía al cerrar | Media (A11y) | `lastFocus`, foco al botón cerrar, retorno al origen |
| 8 | Carrito sin `role="dialog"`, `aria-modal`, `aria-hidden` | Media (A11y) | Añadidos y sincronizados |
| 9 | Sin enlace "saltar al contenido" | Baja (A11y) | Añadido |
| 10 | Animación `pulse` ignoraba `prefers-reduced-motion` | Baja (A11y) | Media query que desactiva animaciones |
| 11 | `localStorage` se consumía sin validar → un valor manipulado rompía la página | Media (Robustez) | Validación de esquema, ids reales y tope de 20 uds |
| 12 | El botón Comprar seguía activo con el carrito vacío | Baja | `disabled` reactivo |
| 13 | Sin cabeceras de seguridad | Media | CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| 14 | Sin `:focus-visible` → navegación por teclado invisible | Media (A11y) | Contorno rojo en todos los focos |
| 15 | Anclas ocultas bajo el header fijo | Baja | `scroll-padding-top` |

### Ya estaba bien

Cero scroll horizontal (validado a 320/360/390/768 px), cero errores de consola, cero imágenes rotas, `lazy-loading` correcto, imágenes en WebP (1,5 MB toda la colección), sin dependencias externas → la página carga sin CDN ni fuentes remotas.

---

## PARTE 2 · Auditoría técnica (backend)

### Corregido

| # | Problema | Gravedad | Solución |
|---|----------|----------|----------|
| 1 | **Sin idempotencia**: Stripe reintenta los webhooks. Un cliente podía recibir el pedido 2-3 veces y tú pagabas la fabricación | **Crítica** | `claimOnce(session.id)` con Upstash Redis (o memoria si no está configurado) |
| 2 | Barajado con `sort(() => 0.5 - Math.random())`, que **está estadísticamente sesgado** | Alta | Fisher-Yates real. Verificado: 20.000 packs → reparto 3.911/4.086 sobre 4.000 ideal |
| 3 | Un pedido de más de 15 cajas rompía el sorteo (devolvía menos figuras de las pagadas) | Alta | Se rellena con baraja nueva manteniendo el "sin repes" por ronda |
| 4 | Si la API de fábrica fallaba, **el pedido se perdía en silencio** | **Crítica** | `fetchRetry` con 3 reintentos y backoff + registro de fallos + email de aviso |
| 5 | Sin registro de pedidos → imposible saber qué se envió a quién | Alta | `logOrder()` + panel `/api/admin?key=…` con reparto por modelo y Golds salidos |
| 6 | Sin avisos: no te enterabas de una venta | Alta | Email por pedido (Resend) con dirección y figuras asignadas |
| 7 | `apiVersion` de Stripe sin fijar → un cambio de Stripe podía romper producción | Media | Fijada a `2024-06-20` |
| 8 | El pack completo no garantizaba los 2 Gold que promete la web | Media (legal) | `packFull` → 15 modelos únicos + exactamente 2 Gold |
| 9 | Sin límites de cantidad en checkout | Media | Tope por SKU (20 uds, 5 en el pack completo) y máximo 10 líneas |
| 10 | Sin `/api/admin` protegido | Media | Clave `ADMIN_KEY` obligatoria |

### Pendiente (te lo marco, no lo puedo hacer yo solo)

- Crear la cuenta de **Upstash** (gratis) y pegar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`. Sin esto la idempotencia sólo dura lo que viva la instancia.
- Crear la cuenta de **Resend** (gratis) para los avisos.
- **Acceso a la Ordering API de JLC3DP**: hay que solicitarlo. Mientras no lo tengas, el sistema entra en modo manual y te manda el pedido por email.

---

## PARTE 3 · Auditoría como cliente + mapa de calor

### Cómo se leía la página antes (recorrido visual)

1. **Zona caliente (0-600 px)**: el usuario aterrizaba en **texto + contador**. Ni una sola figura visible. El 80 % de la atención se iba a un titular y a un reloj que le mete prisa **antes de que sepa qué le estás vendiendo**. Ese es el fallo de conversión número uno de la página.
2. **Zona templada**: al llegar a la rejilla, ya había hecho scroll a ciegas. Buena retención aquí (las fotos son excelentes), pero sin ningún camino a la compra desde la tarjeta.
3. **Zona fría**: precio a 3.000 px de scroll. En móvil eso son ~8 gestos de pulgar. Mucha gente no llega.
4. **Punto de fuga**: sin CTA fija en móvil, quien se convencía viendo la figura 07 tenía que volver a buscar el botón.

### Cambios aplicados para conversión

| Cambio | Por qué |
|---|---|
| **Producto visible en el primer pantallazo** (collage: figura grande + dos secundarias, una de ellas la dorada) | El usuario entiende el producto en 2 segundos. Es lo que más mueve la aguja. |
| **"Desde 29,90 €" junto al CTA principal** | Elimina el miedo al precio oculto. Quien no puede pagarlo se va antes (bien), quien sí, entra confiado. |
| Dos CTA en el hero: **Quiero mi caja** (rojo) + **Ver las 15 figuras** (secundario) | Captura tanto al comprador impulsivo como al curioso, sin perderlo. |
| **Barra fija inferior en móvil** con precio + botón | Recupera al que se convence a mitad de scroll. Suele subir la conversión móvil de forma notable. |
| Sección **"Cómo funciona"** en 3 pasos | La caja sorpresa genera una duda inmediata ("¿y si me toca repetido?"). Resolverla antes de la rejilla evita el abandono. |
| **Chip "Pago seguro"** en el hero y fila de métodos de pago bajo los packs | Marca desconocida + 699 € = desconfianza. Los sellos de pago la reducen. |
| **Precio por figura** en cada pack (29,90 / 26,63 / 24,98 / 46,66 €) | Hace evidente que el pack de 3 y el de 6 son mejor trato. Empuja el ticket medio. |
| Sección Gold en **fondo negro** con las dos fotos doradas y CTA propio | Antes pasaba desapercibida siendo el gancho más fuerte que tienes. |
| **Botón "Ampliar"** visible en cada foto | La gente no adivina que la tarjeta es clicable. |
| FAQ nueva: **"¿Puedo elegir qué figura quiero?"** | Es la primera objeción real de una blind box. |
| Enlaces legales en el footer | Además de obligatorio, transmite que hay una empresa detrás. |

### ¿Compraría?

Como cliente tipo (aficionado JDM, 25-40 años, llega desde Threads/TikTok): **sí, el pack de 3 a 79,90 €**. El producto se ve premium, el "sin repetidos" está bien resuelto y el Gold da un motivo para volver.

**Lo que todavía me frenaría, por orden de importancia:**

1. **Cero prueba social.** Ni una reseña, ni una foto de un cliente, ni un contador de unidades vendidas. Es lo que más falta ahora mismo. *No voy a inventarme reseñas falsas: es ilegal (Ley de Consumidores y Directiva Omnibus) y Stripe puede bloquearte la cuenta.* La vía honesta: lanzar con 10-20 unidades a coste para creadores/amigos, pedirles foto y reseña reales, y publicarlas. Mientras tanto, se puede mostrar honestamente "Primera tirada · Edición fundacional".
2. **No sé cuándo me llega.** Has pedido no poner plazos, y lo he respetado, pero un comprador necesita *alguna* referencia. Mínimo legal en la UE: informar del plazo de entrega antes de pagar. Propongo "Fabricación bajo pedido: te avisamos por email en cada paso" — sin dar días concretos.
3. **699,90 € es un salto enorme** desde 149,90 €. Sin reseñas, casi nadie lo comprará de entrada. Sugerencia: añadir la opción de pago fraccionado de Stripe (Klarna) para ese pack.
4. **No hay páginas legales.** Un comprador que las busca y ve enlaces rotos, se va. Ahora mismo están enlazadas pero no creadas.

---

## PARTE 4 · Qué falta para poder vender (checklist)

- [ ] **Fase 2** — Repo en GitHub + deploy en Vercel + dominio `sscarsgarage.roadshop.online`
- [ ] **Fase 3** — Stripe: 4 precios, claves, webhook, prueba con tarjeta 4242
- [ ] **Fase 3b** — Upstash + Resend (5 min cada uno, gratis)
- [ ] **Fase 4** — Páginas legales: aviso legal, privacidad, cookies, condiciones de venta, desistimiento 14 días
- [ ] **Fase 4b** — Modelos 3D y decisión de fabricación (ver `GUIA_3D_Y_PRODUCCION.md`)
- [ ] **Fase 5** — Automatización de contenido (Threads + IA + Vercel Cron)
- [ ] Prueba social real antes de invertir en tráfico
