# 🛠️ SSCARS GARAGE 2.0 — 3D ASSET PIPELINE (BLENDER CLI)

> **Herramienta Local:** `tools/blender/sscars_asset_pipeline.py`  
> **Ámbito de ejecución:** Local en el PC del usuario/taller (Blender 4.x / Python 3.10+).  
> **Seguridad de Git:** Los archivos binarios pesados (`*_raw.glb`, `*_master.blend`, `*_print.3mf`) **permanecen exclusivamente en local** y nunca se suben al repositorio.

---

## 📑 ÍNDICE

1. [Propósito del Pipeline](#1-propósito-del-pipeline)
2. [Requisitos e Instalación](#2-requisitos-e-instalación)
3. [Comandos de Ejecución y Modo Dry-Run](#3-comandos-de-ejecución)
4. [Estructura de Outputs](#4-estructura-de-outputs)
5. [Sistema de Configuración Modular (`configs/*.json`)](#5-sistema-de-configuración-modular)
6. [Confidence Scoring y Estados QA (`PASS` / `REVIEW_REQUIRED`)](#6-confidence-scoring-y-estados-qa)
7. [Limitaciones Conocidas y Filosofía Conservadora](#7-limitaciones-conocidas)
8. [Cómo Añadir un Nuevo Vehículo](#8-cómo-añadir-un-nuevo-vehículo)

---

## 1. PROPÓSITO DEL PIPELINE

Los generadores de IA (Tripo3D, Meshy) entregan mallas densas sin estructurar, con ruedas fundidas a la carrocería, escala arbitraria y cierres artificiales en los bajos.

Este pipeline automatiza el procesamiento en Blender para:
- **Normalizar:** Orientación ($\text{+Y: Frontal, +X: Derecha, +Z: Arriba}$) y escala física canónica a $70.0\text{ mm}$.
- **Detectar:** Las 4 ruedas mediante ajuste cilíndrico en cuadrantes espaciales y verificación de simetría bilateral.
- **Segmentar:** Carrocería (`BODY`), Ruedas (`WHEEL_FL`, `WHEEL_FR`, `WHEEL_RL`, `WHEEL_RR`), Alerón (`SPOILER`) y Escape (`EXHAUST`).
- **Saneamiento:** Detección de cierres planos artificiales en los bajos y generación de chasis limpio.
- **Auditar:** Reporte QA estructurado en JSON con cálculo de confianza.
- **Exportar:** Activo MASTER multi-cuerpo (`.blend`), Web GLB optimizado (`.glb`) y archivo de impresión física (`.3mf`).

---

## 2. REQUISITOS E INSTALACIÓN

- **Blender 4.0 o superior** instalado localmente y disponible en el `PATH` del sistema (o invocable mediante ruta absoluta).
- Python 3.10+ integrado en Blender.

---

## 3. COMANDOS DE EJECUCIÓN

### A. Modo Seguro de Inspección y Análisis (`--dry-run`)
No modifica el archivo RAW original ni escribe archivos master. Muestra el dictamen QA en terminal:
```bash
blender --background --python tools/blender/sscars_asset_pipeline.py -- \
    --input "assets_raw/350z_raw.glb" \
    --slug 350z \
    --dry-run
```

### B. Procesamiento Completo y Exportación de Master
```bash
blender --background --python tools/blender/sscars_asset_pipeline.py -- \
    --input "assets_raw/350z_raw.glb" \
    --config "tools/blender/configs/350z.json" \
    --output-dir "assets_master" \
    --report-json "assets_master/350z_qa_report.json"
```

### C. Ejecución Unitaria sin Blender (Pruebas de Lógica Pura en Python)
```bash
python3 tools/blender/sscars_asset_pipeline.py --input "dummy.glb" --slug 350z --dry-run
```

---

## 4. ESTRUCTURA DE OUTPUTS (LOCAL)

```
[ PC LOCAL DEL USUARIO ] (Fuera de Git)
├── assets_raw/                     → Archivos GLB descargados de Tripo/Meshy
│   └── 350z_raw.glb
├── assets_master/                  → Escena MASTER organizada por colecciones
│   ├── 350z_master.blend
│   └── 350z_qa_report.json
├── assets_web/                     → GLB comprimido para el visor web y configurador
│   └── 350z_web.glb
└── assets_print/                   → Archivo para taller y fabricación aditiva
    └── 350z_70mm.3mf
```

---

## 5. SISTEMA DE CONFIGURACIÓN MODULAR

Las configuraciones se organizan en `tools/blender/configs/`:
- **`default.json`:** Configuración base con ejes, umbrales de tolerancia y parámetros generales de impresión.
- **`{slug}.json`:** Sobrescritura específica para cada vehículo (p. ej. `350z.json`, `r32.json`, `r34.json`).

Ejemplo de configuración específica (`350z.json`):
```json
{
  "slug": "350z",
  "name": "Colmillo Azul",
  "target_length_mm": 70.0,
  "wheels": {
    "expected_radius_range_mm": [12.0, 14.5],
    "symmetry_tolerance_mm": 1.0
  },
  "spoiler": {
    "expected": false,
    "type": "ducktail_integrated"
  },
  "exhaust": {
    "expected": true,
    "layout": "dual_symmetric"
  }
}
```

---

## 6. CONFIDENCE SCORING Y ESTADOS QA

Cada detección geométrica devuelve un índice de confianza $[0.0, 1.0]$:

| Estado QA | Condición de Confianza | Acción del Pipeline |
|---|---|---|
| 🟢 **`PASS`** | Todas las detecciones $\ge 0.85$ | Procesa y exporta automáticamente. |
| 🟡 **`WARNING`** | Puntuación media $\ge 0.85$, pero algún componente está entre $0.60$ y $0.85$ | Exporta pero incluye advertencias en el reporte. |
| 🟠 **`REVIEW_REQUIRED`** | Algún componente $< 0.60$ o geometría fundida detectada | Requiere inspección visual en Blender antes de validar. |
| 🔴 **`FAIL`** | Puntuación $< 0.35$ o ruedas ausentes/asimétricas | Aborta el procesamiento para evitar archivos corruptos. |

---

## 7. LIMITACIONES CONOCIDAS Y FILOSOFÍA CONSERVADORA

1. **No inventar geometría:** Si un alerón o escape no tiene contraste de volumen suficiente en la malla IA, el pipeline lo marca como `none` o `REVIEW_REQUIRED` en vez de forzar cortes destructivos.
2. **Topología no-manifold en pasos de rueda:** Si la rueda está fundida con la aleta sin un pliegue claro ($< 35^\circ$), se aplica un plano de partición cilíndrico de seguridad y se solicita revisión humana.

---

## 8. CÓMO AÑADIR UN NUEVO VEHÍCULO

1. Crear un archivo `tools/blender/configs/{slug}.json`.
2. Especificar las dimensiones esperadas de ruedas, presencia de alerón (`expected: true/false`) y configuración de escape (`single_left`, `dual_symmetric`, `quad`).
3. Ejecutar el pipeline en modo `--dry-run` para verificar el dictamen QA.
