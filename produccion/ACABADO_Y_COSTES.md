# Acabado liso y coste real — lo que cambia el planteamiento

> Documento de decisión. Responde a: "si todo lo impreso sale con textura
> escalonada y lijarlo dispara el precio, ¿cómo vendo esto?"

---

## Resumen

La premisa es incorrecta en dos puntos, y cada uno por separado ya elimina el
problema:

1. **La textura escalonada es de FDM (filamento), no de resina.** Tu ficha
   técnica ya especifica resina. A 25-50 micras las capas son invisibles a
   simple vista.
2. **En producción no se imprime cada unidad.** Se imprime **un master**, se
   hace un molde de silicona y se cuelan las copias. El lijado, si hace falta,
   se paga **una vez por modelo**, no una vez por unidad.

No hay que vender "un coche con textura". Hay que no tener textura.

---

## 1. Resina no es FDM

Son dos tecnologías distintas y el error es confundirlas:

| | FDM (filamento) | Resina (MSLA/SLA) |
|---|---|---|
| Altura de capa | 0,10–0,30 mm | **0,01–0,05 mm** |
| Resolución XY | 0,4 mm (la boquilla) | 0,035–0,05 mm |
| Detalle mínimo | ~0,5 mm | ~0,1 mm |
| Superficie | Líneas visibles | **Lisa al salir** |

En FDM las líneas se ven y se tocan: hay que lijar y aplicar masilla. En resina
a 25-50 micras las capas son unas 6-10 veces más finas, y además no hay marcas
de extrusión, ni costura, ni *ringing*. La superficie sale lisa de la máquina.

Esto no es opinión de foro: es la razón por la que **todas** las miniaturas de
calidad — Warhammer, minis de rol, prototipos de joyería — se hacen en resina y
no en filamento.

**Un matiz honesto:** en superficies muy curvas y tendidas (un capó, un techo)
puede quedar un escalonado finísimo si se imprime a 50 micras. Se resuelve
bajando a 25 micras y orientando la pieza inclinada en la plataforma. Es un
ajuste del fichero, no un coste de mano de obra.

---

## 2. Nadie fabrica 500 figuras imprimiéndolas de una en una

Aquí está el error de coste importante. Así se fabrica un art toy de verdad
(es literalmente el proceso de Pop Mart):

```
1. Imprimir UN master en resina, a 25 micras           ← una vez por modelo
2. Repasarlo a mano: lijar, imprimar, pulir            ← una vez por modelo
3. Molde de silicona a partir del master               ← una vez por modelo
4. Colar copias en el molde                            ← cada unidad
5. Pintar                                              ← cada unidad
```

La silicona copia la superficie del master **exactamente**. Si el master está
pulido, las 300 copias salen pulidas. El trabajo de lijado que te preocupa
existe, pero es un **coste fijo de unos 30-60 € por modelo**, no un coste por
unidad.

Repartido entre 300 unidades, ese lijado son **0,10-0,20 € por figura**.

> Pop Mart hace exactamente esto: imprime el master en resina, un artesano lo
> repasa a mano hasta dejarlo perfecto, y de ahí salen los moldes. Las tiradas
> pequeñas y exclusivas usan molde de silicona; solo cuando el volumen lo
> justifica pasan a molde de acero e inyección.

Y hay un tercer factor que remata el asunto: **la figura va pintada**. La
pintura de fábrica lleva imprimación, y la imprimación rellena la microtextura
que pudiera quedar. Es el paso que en modelismo se usa precisamente para eso.

---

## 3. Los tres caminos, con números

Estimaciones para confirmar con los presupuestos de `EMAIL_RFQ.md`.
Figura de 70 mm, hueca, pared 2 mm → unos **10-14 cm³**, 12-16 g de resina.

### A · Impresión por unidad bajo demanda (POD)

| Concepto | Coste |
|---|---|
| Pieza impresa en resina | 1-2 € |
| Envío | 6-9 € |
| **Sin pintar** | — |

Cero inversión inicial y cero stock, pero sale **monocroma**: el POD no pinta.
Sirve para validar la malla y tener una muestra en la mano. No es tu producto
final.

### B · Master + molde de silicona + colada ← **el que te interesa**

| Concepto | Coste | Tipo |
|---|---|---|
| Master impreso a 25 µm | 15-40 € | fijo/modelo |
| Repaso a mano del master | 20-60 € | fijo/modelo |
| Molde de silicona | 60-150 € | fijo/modelo |
| Copia colada y pintada | 2-4 € | por unidad |

Con 100 unidades por modelo: los fijos son ~1,70 €/ud. Coste total por figura
**≈ 4-6 €**. MOQ típico 100. Es el estándar de los art toys de tirada corta.

### C · Inyección en fábrica (PVC/ABS)

| Concepto | Coste |
|---|---|
| Molde de acero | 3.000-8.000 € por modelo |
| Unidad pintada | 1,5-3 € |
| MOQ | 300-500 |

El coste por unidad es imbatible, pero **15 modelos × 5.000 € = 75.000 € de
utillaje** antes de vender nada. Descartado para lanzar. Es a donde migras
cuando un modelo ya vende solo.

---

## 4. ¿Sale la cuenta a 24,95 €?

Escenario B, 100 uds/modelo:

| Concepto | Coste |
|---|---|
| Figura colada y pintada | 3,50 € |
| Amortización master + molde | 1,70 € |
| Caja y bolsa | 0,80 € |
| Envío al cliente | 4,00 € |
| Comisión Stripe | 1,00 € |
| **Total** | **≈ 11 €** |
| **PVP** | **24,95 €** |
| **Margen** | **≈ 14 € (56 %)** |

El margen aguanta de sobra. Lijar el master no lo rompe: son 0,20 € de esos 11.

### El problema real no es el acabado, es el capital

15 modelos × 100 uds × ~5 € = **7.500 € por adelantado**, y en un blind box
necesitas todos los modelos disponibles a la vez o el coleccionable no
funciona.

**Recomendación: lanza la Serie 1 con 6 modelos, no 15.** Son ~3.000 € en vez
de 7.500 €, el sorteo sigue teniendo gracia, y "Serie 1 de 6" es un formato
normal en este mercado — además te deja la Serie 2 como argumento de
continuidad. Los 15 los tienes diseñados; no se tiran, se escalonan.

---

## 5. Entonces, ¿por qué te lo comprarían?

Nadie compra un blind box por lo liso que está. La lisura es **requisito
mínimo**: si está rugoso parece casero y no lo compran, pero si está liso
tampoco es un argumento de venta. No se vende, se da por hecho.

Lo que hace que se pague 24,95 € por una figura de 70 mm:

1. **El sorteo.** No sabes cuál te toca. Es el motor del formato y ya lo tienes
   implementado — sin repetidos y con Gold 1/500, validado con 20.000
   simulaciones. Es la parte más difícil y está hecha.
2. **La colección.** Quien compra una quiere las 15. El valor está en el hueco
   vacío de la estantería.
3. **El coche concreto.** Tu comprador no quiere "una figura": quiere **su**
   coche. Un R34 en Bayside Blue con llantas doradas activa algo que un
   personaje genérico no activa. Ahí compites con una ventaja que Pop Mart no
   tiene.
4. **El chase.** El Gold Chrome al 0,2 % es lo que hace que alguien compre la
   sexta caja.

Tu producto no es el plástico. Es el sorteo más la nostalgia JDM. El acabado
solo tiene que estar a la altura para no estorbar.

---

## 6. Y si aun así quieres diferenciarte por el acabado

Existe una vía legítima: **abrazar la faceta**. Un coche low-poly facetado, con
aristas marcadas y planos limpios, es una decisión estética reconocible, no un
defecto. Funciona en art toys.

Pero sé consciente de lo que implica: **es otro producto**. Deja de ser un
coleccionable realista de coche y pasa a ser una pieza de diseño geométrico. El
comprador nostálgico que quiere su R34 tal cual lo recuerda ya no es tu
comprador.

Mi opinión: no lo hagas ahora. Tus 15 fotos de producto son de figuras lisas y
realistas, la web está construida sobre esas imágenes, y el acabado liso está
resuelto por 0,20 € de master. Guarda la idea facetada como serie especial más
adelante, si acaso.

---

## 7. Qué hacer esta semana

1. **No cambies el diseño ni el precio.** El problema que creías tener no
   existe con resina.
2. **Manda el RFQ ya**, con las preguntas de la sección siguiente añadidas.
3. **Pide muestra física de un solo modelo** — el R34, que es el que ya tienes
   preparado. Tócala antes de decidir nada.
4. **Decide entre 6 y 15 modelos** cuando tengas el precio real por unidad.

### Añade estas preguntas al RFQ

Al correo de `EMAIL_RFQ.md`, apartado A:

> - What layer height do you print the master at? We require **25 microns or
>   finer**.
> - Is the master hand-finished (sanded and primed) before moulding? Is this
>   included in the unit price or quoted separately?
> - For runs of 100-300 units, do you use **silicone moulding and casting**
>   rather than printing each unit individually?
> - Please send close-up photos of the surface finish on a comparable painted
>   figure.
> - Does the unit price include **primer** before the colour coat?

Si un proveedor responde que imprime cada unidad por separado en FDM, descártalo
sin más. Si te habla de master, silicona y colada, está en el proceso correcto.
