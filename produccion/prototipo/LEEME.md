# Prototipo · Registro de figura, colección e intercambios

Maqueta navegable de las propuestas 2 y 3 de `../DIFERENCIACION.md`.
No es código de producción: **no hay backend y no hay cuentas**. El estado se
guarda en `localStorage`, solo en el navegador que lo abre.

## Probarlo

Las imágenes son copias de `public/images/` y no se versionan (para no duplicar
peso en el repo). Antes de arrancar, cópialas:

```
mkdir -p produccion/prototipo/images
cp public/images/*-front.webp public/images/logo-sscars-cropped.jpg produccion/prototipo/images/
npx serve produccion/prototipo -l 3000
```

## Qué se puede hacer

- **Registrar** · pestaña Registrar → código con formato `SSC-<slug>-<nnn>`,
  por ejemplo `SSC-R34-037`, `SSC-SUPRA-112`. El botón "Simular una caja"
  registra una figura al azar sin escribir nada.
- **Mi colección** · rejilla de 15 huecos. Los que no tienes salen en gris y sin
  nombre. Al pulsar una figura se abre su ficha con la historia.
- **Intercambios** · aparece cuando tienes algún repetido (registra dos veces el
  mismo modelo, o usa "Simular un repetido"). Empareja lo que te sobra con lo
  que te falta.

Para empezar de cero: borra `localStorage` o abre una ventana privada.

## Qué falta para que sea real

- Backend con los códigos válidos y quién ha registrado cada uno (un código solo
  puede canjearse una vez).
- Cuentas de usuario, para que la colección no viva en un solo navegador.
- Los perfiles de la pestaña de intercambios son ficticios, y no hay mensajería
  ni forma de acordar el envío.

Los datos de los 15 modelos en `modelos.json` están extraídos de la web actual
(`public/index.html`), incluidos los textos de historia y las rarezas.
