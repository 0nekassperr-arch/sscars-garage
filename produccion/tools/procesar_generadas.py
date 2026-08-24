#!/usr/bin/env python3
"""
procesar_generadas.py — Limpia y encuadra las vistas elevadas generadas,
y crea sus espejos.

Por que un tratamiento distinto al de las vistas rectas
------------------------------------------------------
En normalizar_vistas.py la escala se fija por la ALTURA real del coche, que es
una dimension compartida por frontal / trasera / laterales (todas son vistas a
la altura del coche). En una vista elevada 40 grados la altura aparente esta
escorzada, asi que igualar alturas encogeria el coche. Para estas vistas se usa
encuadre por caja: el objeto se ajusta al mismo margen del lienzo. Sirven como
vistas de apoyo, no como vistas de calibracion de proporciones.

Uso:
    python3 produccion/tools/procesar_generadas.py r34
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parents[2]
BASE = RAIZ / "produccion" / "vistas3d"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from normalizar_vistas import (  # noqa: E402
    LIENZO, MARGEN, caja, mascara_objeto, sobre_blanco,
)


def encajar(img: Image.Image, mascara: np.ndarray) -> Image.Image:
    """Ajusta el objeto al lienzo respetando el margen, sin deformar."""
    x0, y0, x1, y1 = caja(mascara)
    rgba = img.convert("RGBA")
    rgba.putalpha(Image.fromarray((mascara * 255).astype(np.uint8), mode="L"))
    recorte = rgba.crop((x0, y0, x1, y1))

    util = LIENZO * (1 - 2 * MARGEN)
    escala = util / max(recorte.width, recorte.height)
    nuevo = (max(1, int(recorte.width * escala)), max(1, int(recorte.height * escala)))
    recorte = recorte.resize(nuevo, Image.LANCZOS)

    lienzo = Image.new("RGBA", (LIENZO, LIENZO), (0, 0, 0, 0))
    lienzo.alpha_composite(recorte, ((LIENZO - nuevo[0]) // 2,
                                     (LIENZO - nuevo[1]) // 2))
    return lienzo


def main(modelo: str) -> None:
    destino = BASE / modelo
    generadas = destino / "generadas"
    if not generadas.is_dir():
        sys.exit(f"No hay {generadas}")

    for src in sorted(generadas.glob("*.png")):
        img = Image.open(src)
        m = mascara_objeto(img)
        limpio = encajar(img, m)

        nombre = src.stem
        limpio.save(destino / "alfa" / f"{nombre}.png")
        sobre_blanco(limpio).save(destino / "blanco" / f"{nombre}.png")
        print(f"  procesada {nombre}")

        # espejo -> vista real del lado contrario (figura simetrica)
        esp = ImageOps.mirror(limpio)
        esp.save(destino / "alfa" / f"{nombre}-espejo.png")
        sobre_blanco(esp).save(destino / "blanco" / f"{nombre}-espejo.png")
        print(f"  espejo    {nombre}-espejo")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "r34")
