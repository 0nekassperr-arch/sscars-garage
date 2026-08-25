#!/usr/bin/env python3
"""
preparar_kit.py — Arma el kit final que se sube a Tripo / Meshy.

Tripo multiview exige EXACTAMENTE el orden front, left, back, right y admite
de 2 a 4 imagenes. Meshy usa 1 principal + Left / Back / Right. Los dos
consumen el mismo set de 4, asi que se numeran 1..4 en ese orden para que sea
imposible equivocarse al subirlas.

Ademas genera:
  - hoja_contactos.jpg : las 12 vistas juntas, para revision humana
  - turntable.gif      : giro de 360 grados para comprobar coherencia

Uso:
    python3 produccion/tools/preparar_kit.py r34
"""

import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
BASE = RAIZ / "produccion" / "vistas3d"

# --- Las 4 que van a Tripo, en su orden obligatorio -----------------------
# Se eligen las vistas RECTAS y calibradas: son ortograficas, comparten escala
# y no tienen escorzo. Son las que fijan las proporciones de la malla.
KIT = [
    ("1-front", "{m}-frontal-recta"),
    ("2-left",  "{m}-lateral"),
    ("3-back",  "{m}-trasera-recta"),
    ("4-right", "{m}-lateral-derecha"),
]

# --- Orden de giro para el turntable de revision --------------------------
GIRO = [
    "{m}-frontal-recta",
    "{m}-tresc-frontal",
    "{m}-lateral",
    "{m}-tresc-trasera",
    "{m}-trasera-recta",
    "{m}-tresc-trasera-espejo",
    "{m}-lateral-derecha",
    "{m}-tresc-frontal-espejo",
]


def main(modelo: str) -> None:
    base = BASE / modelo
    blanco = base / "blanco"
    if not blanco.is_dir():
        sys.exit(f"Falta {blanco}")

    kit = base / "kit-tripo"
    kit.mkdir(exist_ok=True)
    for etiqueta, plantilla in KIT:
        src = blanco / f"{plantilla.format(m=modelo)}.png"
        if not src.exists():
            print(f"  AVISO falta {src}")
            continue
        shutil.copy2(src, kit / f"{etiqueta}.png")
        print(f"  kit {etiqueta:8s} <- {src.name}")

    # hoja de contactos
    orden = [f"{n.format(m=modelo)}.png" for n in GIRO]
    orden += [f"{modelo}-tresc-frontal-alto.png",
              f"{modelo}-tresc-trasera-alto.png",
              f"{modelo}-cenital.png"]
    existentes = [str(blanco / n) for n in orden if (blanco / n).exists()]

    subprocess.run(
        ["montage", *existentes, "-tile", "4x3", "-geometry", "320x320+6+6",
         "-background", "#9aa0a6", "-label", "%f",
         str(base / "hoja_contactos.jpg")], check=False)
    print(f"  hoja de contactos -> {base/'hoja_contactos.jpg'}")

    # turntable
    giro = [str(blanco / f"{n.format(m=modelo)}.png") for n in GIRO]
    giro = [g for g in giro if Path(g).exists()]
    subprocess.run(
        ["convert", "-delay", "40", "-loop", "0", "-resize", "420x420",
         *giro, str(base / "turntable.gif")], check=False)
    print(f"  turntable -> {base/'turntable.gif'}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "r34")
