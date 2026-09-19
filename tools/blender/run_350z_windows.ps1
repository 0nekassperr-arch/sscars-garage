# ==============================================================================
# SSCARS GARAGE 2.0 — PROCESAMIENTO 3D LOCAL EN POWERSHELL (NISSAN 350Z)
# ==============================================================================

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "        SSCARS GARAGE 2.0 — PROCESAMIENTO 3D LOCAL (NISSAN 350Z)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Detección de Blender
$blenderCandidates = @(
    "C:\Program Files\Blender Foundation\Blender 4.3\blender.exe",
    "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe",
    "C:\Program Files\Blender Foundation\Blender 4.1\blender.exe",
    "C:\Program Files\Blender Foundation\Blender 4.0\blender.exe",
    "C:\Program Files\Blender Foundation\Blender\blender.exe"
)

$blenderExe = $null
foreach ($candidate in $blenderCandidates) {
    if (Test-Path $candidate) {
        $blenderExe = $candidate
        break
    }
}

if (-not $blenderExe) {
    $inPath = Get-Command blender.exe -ErrorAction SilentlyContinue
    if ($inPath) {
        $blenderExe = $inPath.Source
    }
}

if (-not $blenderExe) {
    Write-Host "[ERROR] No se ha encontrado blender.exe en las rutas habituales." -ForegroundColor Red
    Write-Host "Por favor, instala Blender 4.x o añade su ruta a este script." -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Blender detectado: $blenderExe" -ForegroundColor Green
Write-Host ""

# 2. Verificación del archivo de entrada
$inputGlb = "assets_raw\350z_raw.glb"
if (-not (Test-Path $inputGlb)) {
    Write-Host "[AVISO] Falta el archivo de entrada: $inputGlb" -ForegroundColor Yellow
    Write-Host "1. Coloca tu archivo 350z descargado de Tripo en: assets_raw\350z_raw.glb" -ForegroundColor White
    Write-Host "2. Vuelve a ejecutar este script." -ForegroundColor White
    exit 1
}

# 3. Crear carpetas de salida
@("assets_master", "assets_web", "assets_print", "assets_qa") | ForEach-Object {
    if (-not (Test-Path $_)) { New-Item -ItemType Directory -Path $_ | Out-Null }
}

# 4. Ejecutar Pipeline en Blender
Write-Host "[INFO] Ejecutando pipeline en Blender..." -ForegroundColor Cyan
$arguments = @(
    "-b",
    "--python", "tools\blender\sscars_asset_pipeline.py",
    "--",
    "--input", $inputGlb,
    "--config", "tools\blender\configs\350z.json",
    "--output-dir", "assets_master",
    "--report-json", "assets_qa\350z_qa_report.json"
)

& $blenderExe $arguments

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[ÉXITO] Pipeline completado. Archivos disponibles en assets_master\, assets_web\ y assets_print\" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[ERROR] El pipeline finalizó con código de error $LASTEXITCODE" -ForegroundColor Red
}
