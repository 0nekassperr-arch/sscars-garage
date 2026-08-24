#!/usr/bin/env python3
"""
normalizar_vistas.py — Prepara un set de vistas coherente para multiview 3D
(Tripo / Meshy) a partir de las fotos de producto de SSCARS GARAGE.

Problema que resuelve
---------------------
Las fotos de catalogo estan encuadradas "a ojo": cada vista tiene el coche a
una escala distinta (el frontal esta ~1,7x mas cerca que el lateral). Si se
suben asi a Tripo/Meshy, el reconstructor cree que el coche es mas ancho/corto
de lo que es y la malla sale deformada.

Este script:
  1. Segmenta el coche del fondo blanco (y descarta la sombra suave).
  2. Mide la caja del objeto SIN sombra.
  3. Reescala cada vista a una escala fisica comun, usando dimensiones
     compartidas entre vistas (altura para frontal/trasera/lateral, etc.).
  4. Centra el objeto en un lienzo cuadrado con margen fijo.
  5. Exporta PNG con fondo blanco y PNG con alfa transparente.

Uso:
    python3 produccion/tools/normalizar_vistas.py r34
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
REFS = RAIZ / "produccion" / "referencias"
SALIDA = RAIZ / "produccion" / "vistas3d"

LIENZO = 1024          # lado del lienzo de salida
MARGEN = 0.06          # margen minimo alrededor del objeto (6% por lado)
UMBRAL_FONDO = 244     # por encima de esto, en los 3 canales, es fondo/sombra clara
MIN_AREA = 400         # islas mas pequenas que esto se descartan (ruido)


# --------------------------------------------------------------------------
# Segmentacion
# --------------------------------------------------------------------------
def mascara_objeto(img: Image.Image) -> np.ndarray:
    """Devuelve una mascara booleana del coche, sin fondo ni sombra.

    El fondo es blanco puro y la sombra es un gris muy claro y poco saturado.
    El coche es azul metalizado (saturado) con partes negras y rojas oscuras.
    Se combina un criterio de luminancia con uno de saturacion para no comerse
    los neumaticos negros ni dejar dentro la sombra."""
    rgb = np.asarray(img.convert("RGB")).astype(np.int16)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]

    maxc = rgb.max(axis=2)
    minc = rgb.min(axis=2)
    croma = maxc - minc              # 0 = gris puro

    # Oscuro (neumatico, cristal, bajos) -> objeto
    oscuro = maxc < UMBRAL_FONDO - 18
    # Con color (azul, rojo, dorado) -> objeto
    con_color = croma > 16
    # Gris claro y sin color -> fondo o sombra
    mascara = oscuro | con_color

    return limpiar(mascara)


def limpiar(mascara: np.ndarray) -> np.ndarray:
    """Rellena huecos y se queda con la mayor componente conexa."""
    from scipy import ndimage

    mascara = ndimage.binary_closing(mascara, np.ones((5, 5)))
    etiquetas, n = ndimage.label(mascara)
    if n == 0:
        return mascara
    tam = ndimage.sum(mascara, etiquetas, range(1, n + 1))
    mayor = int(np.argmax(tam)) + 1
    mascara = etiquetas == mayor
    mascara = ndimage.binary_fill_holes(mascara)
    mascara = ndimage.binary_dilation(mascara, np.ones((3, 3)))
    return mascara


def caja(mascara: np.ndarray):
    ys, xs = np.nonzero(mascara)
    if len(xs) == 0:
        raise ValueError("mascara vacia")
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1  # x0,y0,x1,y1


# --------------------------------------------------------------------------
# Normalizacion
# --------------------------------------------------------------------------
def recortar_y_encajar(img: Image.Image, mascara: np.ndarray,
                       escala_px: float, ancla: str = "centro") -> Image.Image:
    """Recorta al objeto y lo coloca en un lienzo cuadrado a la escala dada.

    escala_px = cuantos pixeles del lienzo final mide 1 pixel del original.
    """
    x0, y0, x1, y1 = caja(mascara)

    rgba = img.convert("RGBA")
    alfa = Image.fromarray((mascara * 255).astype(np.uint8), mode="L")
    rgba.putalpha(alfa)
    recorte = rgba.crop((x0, y0, x1, y1))

    nuevo_w = max(1, int(round(recorte.width * escala_px)))
    nuevo_h = max(1, int(round(recorte.height * escala_px)))
    recorte = recorte.resize((nuevo_w, nuevo_h), Image.LANCZOS)

    lienzo = Image.new("RGBA", (LIENZO, LIENZO), (0, 0, 0, 0))
    off_x = (LIENZO - nuevo_w) // 2
    if ancla == "centro":
        off_y = (LIENZO - nuevo_h) // 2
    else:  # "suelo": apoya el objeto sobre una linea comun
        off_y = int(LIENZO * (1 - MARGEN)) - nuevo_h
    lienzo.alpha_composite(recorte, (off_x, off_y))
    return lienzo


def sobre_blanco(img: Image.Image) -> Image.Image:
    fondo = Image.new("RGBA", img.size, (255, 255, 255, 255))
    fondo.alpha_composite(img)
    return fondo.convert("RGB")


# --------------------------------------------------------------------------
def main(modelo: str) -> None:
    origen = REFS / modelo
    if not origen.is_dir():
        sys.exit(f"No existe {origen}")

    destino = SALIDA / modelo
    (destino / "blanco").mkdir(parents=True, exist_ok=True)
    (destino / "alfa").mkdir(parents=True, exist_ok=True)

    # 1) medir todas las vistas
    medidas = {}
    for ruta in sorted(origen.glob("*.webp")):
        img = Image.open(ruta)
        m = mascara_objeto(img)
        x0, y0, x1, y1 = caja(m)
        medidas[ruta.stem] = {
            "ruta": ruta, "img": img, "mascara": m,
            "w": int(x1 - x0), "h": int(y1 - y0),
        }
        print(f"  medido {ruta.stem:24s} objeto {x1-x0:4d} x {y1-y0:4d} px")

    # 2) escala comun: la ALTURA del coche es la dimension compartida por
    #    frontal, trasera y laterales. Se toma el lateral como patron porque
    #    es la vista mas ortografica y la que define el largo.
    patron = None
    for cand in (f"{modelo}-lateral", f"{modelo}-lateral-derecha"):
        if cand in medidas:
            patron = cand
            break
    if patron is None:
        patron = next(iter(medidas))

    # altura de referencia del coche en el lateral, en px de origen.
    # Se excluye el aleron del patron de altura? No: se mantiene la altura
    # total real, que es lo que comparten las vistas.
    h_ref = medidas[patron]["h"]
    largo_ref = medidas[patron]["w"]

    # el objeto mas grande define el zoom del lienzo (para que ninguno se salga)
    util = LIENZO * (1 - 2 * MARGEN)
    escala_base = util / max(largo_ref, h_ref)

    informe = {"modelo": modelo, "patron": patron, "lienzo": LIENZO, "vistas": {}}

    for nombre, d in medidas.items():
        es_cenital = "cenital" in nombre
        if es_cenital:
            # la cenital comparte el LARGO con el lateral, no la altura
            factor = largo_ref / d["h"] if d["h"] > d["w"] else largo_ref / d["w"]
        else:
            factor = h_ref / d["h"]

        escala = escala_base * factor
        img_alfa = recortar_y_encajar(d["img"], d["mascara"], escala)
        img_blanca = sobre_blanco(img_alfa)

        img_alfa.save(destino / "alfa" / f"{nombre}.png")
        img_blanca.save(destino / "blanco" / f"{nombre}.png")

        informe["vistas"][nombre] = {
            "origen_px": [d["w"], d["h"]],
            "factor_escala": round(escala, 4),
        }
        print(f"  escrito {nombre:24s} factor {escala:.3f}")

    (destino / "informe.json").write_text(
        json.dumps(informe, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nListo -> {destino}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "r34")
