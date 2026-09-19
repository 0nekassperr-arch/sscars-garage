# 🛠️ GUÍA DE EJECUCIÓN LOCAL DEL PIPELINE 3D EN WINDOWS

> **Para el usuario:** Esta guía explica paso a paso cómo ejecutar el pipeline de procesamiento 3D en tu propio ordenador Windows usando tu instalación local de Blender, sin necesidad de saber programar.

---

## 🚀 GUÍA RÁPIDA PASO A PASO (NISSAN 350Z)

### 📌 PASO 1 · Instalar Blender
Si aún no tienes Blender, descárgalo e instálalo gratis desde [blender.org](https://www.blender.org/download/) (versión recomendada: **Blender 4.0, 4.1, 4.2 o 4.3**).

---

### 📌 PASO 2 · Localizar tu `blender.exe`
Por defecto, Blender se instala en una de estas rutas:
- `C:\Program Files\Blender Foundation\Blender 4.2\blender.exe`
- `C:\Program Files\Blender Foundation\Blender 4.3\blender.exe`
- `C:\Program Files\Blender Foundation\Blender 4.1\blender.exe`

*(Nuestros scripts buscan automáticamente en estas rutas predeterminadas).*

---

### 📌 PASO 3 · Clonar o Descargar el Repositorio
Abre tu terminal en Windows o descarga el código de la rama `arena/01a03dae-sscars-garage` en tu carpeta de trabajo local.

---

### 📌 PASO 4 · Crear la carpeta `assets_raw`
En la raíz de la carpeta del proyecto (donde ves `public`, `produccion`, `tools`), crea una carpeta llamada:
```text
assets_raw
```
*(Los scripts automáticos también la crean por ti si no existe).*

---

### 📌 PASO 5 · Copiar tu modelo `350z_raw.glb`
1. Descarga el modelo GLB generado en Tripo3D del Nissan 350Z.
2. Renómbralo a:
   ```text
   350z_raw.glb
   ```
3. Pégalo dentro de la carpeta `assets_raw\`.

---

### 📌 PASO 6 · Verificar la ruta en `run_350z_windows.bat` (Opcional)
Si instalaste Blender en una unidad o ruta no estándar (por ejemplo `D:\Blender\...`), abre el archivo `tools\blender\run_350z_windows.bat` con el Bloc de notas y ajusta la línea:
```bat
set "BLENDER_EXE=C:\TuRuta\Blender\blender.exe"
```

---

### 📌 PASO 7 · Ejecutar el Lanzador
Haz **doble clic** en:
```text
tools\blender\run_350z_windows.bat
```
*(O si prefieres PowerShell, ejecuta `.\tools\blender\run_350z_windows.ps1`)*.

---

### 📌 PASO 8 · Resultados y Archivos Generados
Una vez finalizado el proceso, los activos generados aparecerán organizados automáticamente en estas carpetas locales:

| Archivo Generado | Propósito |
|---|---|
| 📁 `assets_master\350z_master.blend` | **Escena Maestra de Blender** con mallas estructuradas en colecciones (`BODY`, `WHEELS`, `SPOILER`, `EXHAUST`). |
| 📁 `assets_web\350z_web.glb` | **Modelo GLB optimizado** y escalado a 70 mm para el visor web y configurador. |
| 📁 `assets_print\350z_70mm.stl` | **Malla estanca STL** escalada exactamente a 70.0 mm con suelo en Z=0 para el taller de impresión física. |
| 📁 `assets_qa\350z_qa_report.json` | **Informe de calidad QA** con los índices de confianza, simetría de ruedas y dimensiones. |

---

## 🧪 MODO DE AUTODIAGNÓSTICO (`--self-test`)

Para comprobar que Blender y sus módulos de importación/exportación están listos en tu sistema, puedes ejecutar:
```bat
"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe" -b --python tools\blender\sscars_asset_pipeline.py -- --self-test
```
Resultado esperado:
```text
==================================================
BLENDER SELF TEST: PASS
Versión de Blender: 4.2.0
GLTF Importer:      OK
GLTF Exporter:      OK
STL Exporter:       OK
==================================================
```

---

## 🚗 EJECUCIÓN GENÉRICA PARA CUALQUIER VEHÍCULO

Para procesar cualquier otro modelo en el futuro (p. ej. R32 o R34), usa el script genérico:
```bat
tools\blender\run_pipeline_windows.bat r32
tools\blender\run_pipeline_windows.bat r34
```
*(Requiere haber colocado previamente `assets_raw\r32_raw.glb` o `assets_raw\r34_raw.glb`)*.
