@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

set "SLUG=%~1"
if "%SLUG%"=="" (
    echo ==============================================================================
    echo SSCARS GARAGE 2.0 — LANZADOR GENÉRICO DE PIPELINE 3D
    echo ==============================================================================
    echo.
    echo Uso: run_pipeline_windows.bat ^<slug_del_coche^>
    echo.
    echo Ejemplos:
    echo   run_pipeline_windows.bat 350z
    echo   run_pipeline_windows.bat r32
    echo   run_pipeline_windows.bat r34
    echo.
    set /p "SLUG=Introduce el slug del vehículo a procesar (ej. 350z): "
)

if "%SLUG%"=="" (
    echo [ERROR] No se ha especificado ningún slug.
    exit /b 1
)

:: 1. DETECCIÓN DE BLENDER
set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"
if not exist "%BLENDER_EXE%" set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.3\blender.exe"
if not exist "%BLENDER_EXE%" set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.1\blender.exe"
if not exist "%BLENDER_EXE%" set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.0\blender.exe"
if not exist "%BLENDER_EXE%" set "BLENDER_EXE=C:\Program Files\Blender Foundation\Blender\blender.exe"
if not exist "%BLENDER_EXE%" (
    where blender.exe >nul 2>&1
    if %errorlevel% equ 0 set "BLENDER_EXE=blender.exe"
)

if not exist "%BLENDER_EXE%" if not "%BLENDER_EXE%"=="blender.exe" (
    echo [ERROR] No se ha encontrado blender.exe.
    echo Por favor, edita la variable BLENDER_EXE en este script.
    pause
    exit /b 1
)

:: 2. VERIFICACIÓN DEL ARCHIVO RAW
set "INPUT_GLB=assets_raw\%SLUG%_raw.glb"
if not exist "%INPUT_GLB%" (
    echo [AVISO] Falta el archivo: "%INPUT_GLB%"
    echo Coloca tu modelo en: assets_raw\%SLUG%_raw.glb
    pause
    exit /b 1
)

:: 3. CREAR DIRECTORIOS
if not exist "assets_master" mkdir assets_master
if not exist "assets_web" mkdir assets_web
if not exist "assets_print" mkdir assets_print
if not exist "assets_qa" mkdir assets_qa

:: 4. EJECUTAR
echo [INFO] Procesando %SLUG% en Blender...
"%BLENDER_EXE%" -b --python "tools\blender\sscars_asset_pipeline.py" -- --input "%INPUT_GLB%" --slug "%SLUG%" --output-dir "assets_master" --report-json "assets_qa\%SLUG%_qa_report.json"

pause
