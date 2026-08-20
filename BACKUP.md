# COPIA DE SEGURIDAD — versión estable v1.0

Punto de retorno creado el **20/08/2026**. Web completa, colores definitivos, backend funcionando.

## Tienes tres formas de volver atrás

### 1. La más rápida (30 segundos, sin tocar código)
La versión estable vive para siempre en esta URL, que **nunca cambia**:

```
https://sscarsgarage-4m0zjkcg3-0nekassperr-archs-projects.vercel.app
```

En Vercel → proyecto **sscarsgarage** → pestaña **Deployments** → busca ese despliegue → botón **⋯** → **Promote to Production**.
Listo: el dominio principal vuelve a servir esta versión.

### 2. Desde GitHub (recupera también el código)

```bash
git checkout v1.0-estable          # ver la versión estable
git checkout -b arreglo v1.0-estable   # trabajar a partir de ella
```

O para tirar por tierra todo lo posterior y volver del todo:

```bash
git reset --hard v1.0-estable
git push --force origin main
```

También existe la rama `estable-v1.0`, que apunta al mismo sitio por si borras la etiqueta.

### 3. Copia local completa

```
/home/user/backups/v1.0-estable/     (3,9 MB)
```

Proyecto entero: web, imágenes, backend, referencias 3D y documentación.

---

## Qué contiene exactamente esta versión

| Bloque | Estado |
|---|---|
| Web | 15 productos, hero con collage, packs, FAQ, legales |
| Colores | R34 azul + llantas doradas · R32 morado · 3000GT rojo · LFA llantas negras · Gold = R34 |
| Hero | Miniaturas: R34 grande + 350Z + LFA |
| Backend | checkout, webhook con idempotencia, panel admin |
| Sorteo | Fisher-Yates, sin repetidos, Gold 1/500 (20.000 simulaciones) |
| Referencias 3D | 15 carpetas, 47 imágenes, colores definitivos |
| Móvil | Sin desbordamiento en 320/360/390/430/768 px |

## Antes de cada cambio grande

```bash
git tag -a v1.1-antes-de-X -m "punto de retorno"
git push origin v1.1-antes-de-X
```

Cuesta cinco segundos y te ahorra un disgusto.
