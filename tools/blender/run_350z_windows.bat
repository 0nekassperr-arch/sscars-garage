@echo off
setlocal enabledelayedexpansion

REM Cambiar a la raiz del repositorio
cd /d "%~dp0\..\.."

echo ==============================================================================
echo        SSCARS GARAGE 2.0 - PROCESAMIENTO 3D LOCAL (NISSAN 350Z)
echo ==============================================================================
echo.

REM 1. Buscar Blender en rutas estandar de 64-bit
set "BLENDER_EXE="

if exist "C:\Program Files\Blender Foundation\Blender 4.3\blender.exe" (
    set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.3\blender.exe"
)
if not defined BLENDER_EXE if exist "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe" (
    set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"
)
if not defined BLENDER_EXE if exist "C:\Program Files\Blender Foundation\Blender 4.1\blender.exe" (
    set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.1\blender.exe"
)
if not defined BLENDER_EXE if exist "C:\Program Files\Blender Foundation\Blender 4.0\blender.exe" (
    set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.0\blender.exe"
)
if not defined BLENDER_EXE if exist "C:\Program Files\Blender Foundation\Blender\blender.exe" (
    set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender\blender.exe"
)

REM Fallback a PATH del sistema
if not defined BLENDER_EXE (
    where blender.exe >nul 2>&1
    if !errorlevel! equ 0 (
        set "BLENDER_EXE=blender.exe"
    )
)

REM Comprobar si se encontro Blender
if not defined BLENDER_EXE (
    echo [ERROR] No se ha encontrado blender.exe en las rutas estandar de instalacion.
    echo Por favor, instala Blender 4.x o edita este archivo (.bat)
    echo para especificar la ruta exacta de tu instalacion de Blender.
    echo Ejemplo: set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"
    echo.
    pause
    exit /b 1
)

echo [OK] Blender detectado: "!BLENDER_EXE!"
echo [OK] Directorio de trabajo: "%CD%"
echo.

REM 2. Comprobar archivo de entrada
set "INPUT_GLB=assets_raw\350z_raw.glb"

if not exist "!INPUT_GLB!" (
    echo ==============================================================================
    echo [AVISO] Falta el archivo de entrada: "!INPUT_GLB!"
    echo.
    echo INSTRUCCIONES:
    echo 1. Crea la carpeta "assets_raw" en la raiz del proyecto si no existe.
    echo 2. Descarga el modelo GLB de Tripo3D del Nissan 350Z.
    echo 3. Renombralo como "350z_raw.glb" y colocalo dentro de "assets_raw\".
    echo 4. Vuelve a ejecutar este archivo batch.
    echo ==============================================================================
    echo.
    pause
    exit /b 1
)

REM 3. Crear carpetas de salida si no existen
if not exist "assets_master" mkdir assets_master
if not exist "assets_web" mkdir assets_web
if not exist "assets_print" mkdir assets_print
if not exist "assets_qa" mkdir assets_qa

REM 4. Ejecutar pipeline en Blender
echo [INFO] Ejecutando pipeline en Blender...
echo.

"!BLENDER_EXE!" -b --python "tools\blender\sscars_asset_pipeline.py" -- --input "assets_raw\350z_raw.glb" --config "tools\blender\configs\350z.json" --output-dir "assets_master" --report-json "assets_qa\350z_qa_report.json"

if !errorlevel! neq 0 (
    echo.
    echo [ERROR] El pipeline ha finalizado con errores. Revisa los mensajes anteriores.
) else (
    echo.
    echo ==============================================================================
    echo [EXITO] Procesamiento completado correctamente.
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
