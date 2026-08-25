#!/usr/bin/env python3
"""
derivar_espejos.py — Genera las vistas simetricas que faltan.

La figura es simetrica respecto a su plano longitudinal: se comprobo que
r34-lateral-derecha es el espejo exacto de r34-lateral (RMSE 0,36 %). Por
tanto el espejo de una vista de tres cuartos es una vista REAL del lado
contrario, no una invencion del modelo. Es la forma mas fiel de ampliar el
set: cero alucinacion, pixeles originales.

Uso:
    python3 produccion/tools/derivar_espejos.py r34
"""

import sys
from pathlib import Path

from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parents[2]
BASE = RAIZ / "produccion" / "vistas3d"

# vista original -> nombre de la vista espejada
ESPEJOS = {
    "{m}-tresc-frontal": "{m}-tresc-frontal-espejo",
    "{m}-tresc-trasera": "{m}-tresc-trasera-espejo",
}


def main(modelo: str) -> None:
    destino = BASE / modelo
    if not destino.is_dir():
        sys.exit(f"Falta {destino}. Ejecuta antes normalizar_vistas.py")

    for plantilla, salida in ESPEJOS.items():
        origen_n = plantilla.format(m=modelo)
        salida_n = salida.format(m=modelo)
        for carpeta in ("alfa", "blanco"):
            src = destino / carpeta / f"{origen_n}.png"
            if not src.exists():
                print(f"  aviso: no existe {src}")
                continue
            img = Image.open(src)
            # mirror horizontal: conserva alfa y no reescala nada
            espejo = ImageOps.mirror(img)
            espejo.save(destino / carpeta / f"{salida_n}.png")
        print(f"  espejo {origen_n} -> {salida_n}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "r34")
