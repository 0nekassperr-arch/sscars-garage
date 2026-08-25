# Por qué te comprarían la primera vez

> Responde a: "vale, pero ¿por qué me comprarían **a pesar de todo esto**?"

---

## Tienes razón, y es un fallo de mi respuesta anterior

Las cinco ideas del documento anterior —numeración, registro, intercambio,
peana, tarjeta— tienen todas el mismo defecto:

**Solo funcionan después de la primera compra.**

El intercambio necesita que ya tengas repetidos. El registro necesita que ya
tengas una figura. La colección al 4/15 solo motiva a quien ya compró 4. Son
mecánicas de **retención**, y yo te las vendí como si fueran de **captación**.

Para alguien que aterriza en tu web por primera vez —no te conoce, no ha visto
nunca la figura, no sabe si existes— nada de eso pesa. Lo que ve es: una marca
desconocida pidiéndole 24,95 € por un juguete que no puede tocar, con la
posibilidad de que le toque uno que no quiere.

Esa es la pregunta de verdad, y es la más difícil del negocio.

---

## La respuesta corta

**No te van a comprar por la web. La web no convence a nadie que llegue frío.**

Ninguna tienda nueva convierte a desconocidos. Lo que convierte es llegar ya
queriéndolo. Y ahí tienes una ventaja que no has usado: **tus productos tienen
audiencia propia antes de existir**.

Nadie busca "Molly" ni "Skullpanda" si no conoce Pop Mart. Pero hay cientos de
miles de personas que **ya buscan "R34", "AE86", "RX-7 FD"** todos los días. Ese
público existe, es enorme, es apasionado y no lo has creado tú: te lo regala la
cultura JDM.

Pop Mart tuvo que construir el deseo por sus personajes desde cero, con años y
millones. Tú te enchufas a un deseo que lleva treinta años ahí.

> Tu ventaja de captación no son las figuras. Es que **puedes hacer contenido que
> se ve solo**, porque el protagonista ya es famoso.

Un vídeo titulado *"Por qué el AE86 es el coche más importante de Japón"* tiene
audiencia el día uno. Un vídeo sobre un personaje inventado, no. La figura
aparece al final del vídeo, y para entonces el espectador ya no está comprando
plástico: está comprando el coche de su adolescencia.

**Por eso te comprarían: porque no llegan a tu web a decidir. Llegan ya
decididos.**

---

## Los tres bloqueos reales (y ninguno es el diseño)

### Bloqueo 1 · No hay prueba de que el producto exista ⛔ el grave

Todas las imágenes de la web son renders. No hay ni una sola foto de una figura
real, en una mano, sobre una mesa, con luz de casa.

Un comprador de figuras detecta un render a un kilómetro, y la conclusión
inmediata es *"esto es un dropshipping, me llega otra cosa o no me llega nada"*.
Es, con diferencia, la razón número uno por la que no te van a comprar.

**Se arregla con 15 €.** Pide **una muestra física del R34** (el escenario A del
RFQ, ya lo tienes preparado). Cuando la tengas:

- Fotos reales: en la mano, junto a una moneda para dar escala, sobre una
  estantería, con luz natural.
- Un vídeo de 20 segundos abriendo la caja.
- Un plano del culo de la figura, de la peana, de la tarjeta.

Eso vale más que rediseñar la web entera. Hasta que no tengas la muestra en la
mano, **no lances**.

### Bloqueo 2 · El contador es un problema, no un activo

En `public/index.html`, línea 993:

```js
const TARGET = new Date('2026-12-31T23:59:59+01:00').getTime();
```

Es una fecha fija escrita a mano, y debajo pone *"esta colección no volverá a
estar disponible. Jamás."*

El comprador de coleccionismo está **vacunado** contra esto. Ha visto mil
contadores falsos. Y el tuyo no está atado a nada real: no cuenta unidades, no
cuenta stock, solo cuenta días hasta una fecha que te inventaste.

Lo peor es que **te sobra**, porque tienes escasez de verdad: si fabricas 300
unidades, **hay 300 unidades**. Eso no es marketing, es un hecho.

Cambia el contador de tiempo por un **contador de unidades reales**:

> `SERIE 1 · 300 unidades numeradas · quedan 214`

Esto sí es creíble, sí es verificable (cada cliente tiene su número), y conecta
directamente con la numeración que te gustó. Un contador de tiempo inventado
resta credibilidad; un contador de unidades reales la añade.

### Bloqueo 3 · Los textos legales están sin terminar

`public/legal/devoluciones.html` empieza con *"Borrador pendiente de
completar"* y tiene `[EMAIL]` sin sustituir. Igual en el resto.

Quien duda antes de pagar va a mirar justo ahí, y encontrar un marcador de
posición confirma su sospecha. Son 20 minutos de trabajo y bloquean ventas.

---

## Lo que sí hace que un desconocido compre

Ordenado por lo que más pesa:

| | Qué | Por qué funciona |
|---|---|---|
| 1 | **Foto/vídeo real del producto** | Elimina el miedo a la estafa. Nada lo sustituye. |
| 2 | **El coche concreto** | No compra "una figura": compra *su* coche. |
| 3 | **La cara detrás** | Una persona con un proyecto vende; una marca anónima no. |
| 4 | **Primeros clientes visibles** | Cinco fotos de gente real valen más que tu web entera. |
| 5 | **Riesgo cero** | Devolución clara y sin letra pequeña. |
| 6 | **Precio de entrada bajo** | 24,95 € para probar, no 669,95 €. |

Fíjate en el punto 3, porque es el que estás desaprovechando del todo: **no
apareces por ningún lado**. Ahora mismo la web parece una tienda genérica de
importación. Y tu historia real —alguien de Sevilla al que le gustan estos
coches y se ha puesto a fabricar las figuras que no encontraba— es
**exactamente** lo que hace que un nicho apasionado te compre a ti y no a
Aliexpress.

Eso Aliexpress no lo puede copiar. Los coches sí.

---

## El orden correcto (y por qué resuelve también lo del dinero)

Lo que **no** hay que hacer: fabricar 300 × 6 modelos, montar la tienda, y
esperar que llegue gente.

```
1. Pide UNA muestra del R34                        ~15 €, 2 semanas
2. Fotografíala y grábala de verdad                 0 €
3. Abre TikTok/Instagram. Contenido JDM,            0 €, 4-8 semanas
   no contenido de producto. La figura sale
   al final, sin insistir.
4. Lista de espera con la muestra como gancho       0 €
5. Preventa a la lista: Serie 1, 300 numeradas      ← cobras ANTES
6. Con ese dinero, produces
```

El paso 5 es el importante y responde a tu pregunta por otro lado: **en preventa
no le vendes a un desconocido**. Le vendes a alguien que lleva semanas viendo tus
vídeos, que ya vio la muestra física, y que entra en la primera tirada. Esa
persona sí compra.

Y de paso resuelve el problema de capital que te señalé en el documento
anterior: los ~3.000 € de la Serie 1 no los pones tú, los ponen los compradores.
La numeración baja (`007/300`) deja de ser un adorno y pasa a ser el argumento:
*los primeros se llevan los primeros números*.

---

## Entonces, ¿para qué sirven las ideas que te gustaron?

Siguen siendo buenas, pero colócalas en su sitio:

- **Numeración** → sí sirve para la primera venta, porque justifica el precio y
  crea el "sé el 007/300". Es la única de las cinco que capta.
- **QR y registro** → convierte al comprador en contacto. Sirve a partir de la
  primera caja enviada.
- **Intercambio** → retención pura. Se activa a los ~200 clientes.
- **Serie limitada** → sirve desde el día uno **si el contador cuenta unidades
  de verdad** en lugar de días inventados.

Ninguna sustituye a tener una foto real del producto.

---

## Qué haría esta semana

1. **Mandar el RFQ y pedir la muestra del R34.** Todo lo demás depende de eso.
2. **Cambiar el contador de tiempo por contador de unidades.** Es media hora y
   deja de restarte credibilidad.
3. **Rellenar los cuatro textos legales.** 20 minutos.
4. **Abrir la cuenta de TikTok y empezar a publicar contenido JDM ya**, sin
   producto. Cuando llegue la muestra dentro de tres semanas, ya tendrás algo de
   audiencia esperando.

El paso 4 puedes hacerlo hoy y es gratis. Es, de todo lo que hemos hablado, lo
que más determina si vendes o no.

---

## En una frase

No vas a convencer a un desconocido en tu web. Vas a hacer que llegue queriendo
el coche, con una foto real que demuestre que existe, y con un número de unidad
que solo se consigue entrando pronto.
