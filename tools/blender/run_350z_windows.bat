@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ==============================================================================
echo        SSCARS GARAGE 2.0 — PROCESAMIENTO 3D LOCAL (NISSAN 350Z)
echo ==============================================================================
echo.

:: 1. DETECCIÓN / CONFIGURACIÓN DE LA RUTA DE BLENDER
:: Si tu Blender está en otra ruta, modifícala directamente aquí:
set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"

if not exist "%BLENDER_EXE%" (
    set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.3\blender.exe"
)
if not exist "%BLENDER_EXE%" (
    set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.1\blender.exe"
)
if not exist "%BLENDER_EXE%" (
    set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.0\blender.exe"
)
if not exist "%BLENDER_EXE%" (
    set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender\blender.exe"
)

:: Comprobar si blender está en PATH
if not exist "%BLENDER_EXE%" (
    where blender.exe >nul 2>&1
    if %errorlevel% equ 0 (
        set "BLENDER_EXE=blender.exe"
    )
)

if not exist "%BLENDER_EXE%" if not "%BLENDER_EXE%"=="blender.exe" (
    echo [ERROR] No se ha encontrado blender.exe en las rutas estándar.
    echo Por favor, abre este archivo (.bat) y edita la variable BLENDER_EXE con la ruta de tu Blender.
    echo Ejemplo: set "BLENDER_EXE=C:\TuRuta\Blender\blender.exe"
    echo.
    pause
    exit /b 1
)

echo [OK] Blender detectado: "%BLENDER_EXE%"
echo.

:: 2. VERIFICACIÓN DEL ARCHIVO DE ENTRADA (assets_raw\350z_raw.glb)
set "INPUT_GLB=assets_raw\350z_raw.glb"

if not exist "%INPUT_GLB%" (
    echo ==============================================================================
    echo [AVISO] Falta el archivo RAW de entrada: "%INPUT_GLB%"
    echo.
    echo INSTRUCCIONES:
    echo 1. Crea la carpeta "assets_raw" en la raíz de este proyecto si no existe.
    echo 2. Descarga el modelo GLB de Tripo3D del Nissan 350Z.
    echo 3. Renómbralo como "350z_raw.glb" y colócalo dentro de "assets_raw\".
    echo 4. Vuelve a ejecutar este archivo batch.
    echo ==============================================================================
    echo.
    pause
    exit /b 1
)

:: 3. CREACIÓN DE DIRECTORIOS DE SALIDA
if not exist "assets_master" mkdir assets_master
if not exist "assets_web" mkdir assets_web
if not exist "assets_print" mkdir assets_print
if not exist "assets_qa" mkdir assets_qa

:: 4. EJECUCIÓN DEL PIPELINE EN BLENDER
echo [INFO] Iniciando procesamiento en Blender...
echo.

"%BLENDER_EXE%" -b --python "tools\blender\sscars_asset_pipeline.py" -- --input "%INPUT_GLB%" --config "tools\blender\configs\350z.json" --output-dir "assets_master" --report-json "assets_qa\350z_qa_report.json"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] El pipeline ha finalizado con errores. Revisa los mensajes anteriores.
) else (
    echo.
    echo ==============================================================================
    echo [ÉXITO] Procesamiento completado correctamente.
    echo.
    echo Archivos generados:
    echo   * MASTER BLEND : assets_master\350z_master.blend
    echo   * WEB GLB      : assets_web\350z_web.glb
    echo   * PRINT STL    : assets_print\350z_70mm.stl
    echo   * REPORTE QA   : assets_qa\350z_qa_report.json
    echo ==============================================================================
)

echo.
pause
