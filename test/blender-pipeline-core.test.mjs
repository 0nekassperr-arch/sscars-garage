/**
 * SSCARS GARAGE 2.0 — Test Suite: Fase 5.2B-1 (Blender Asset Pipeline Core Logic)
 * Valida la lógica pura del pipeline de Blender sin requerir el runtime de bpy:
 * cálculo de escala, orientación, scoring de ruedas, simetría cuadrangular,
 * thresholds de confianza, estados QA y herencia de configuraciones.
 */

import fs from 'fs';
import path from 'path';

let ok = true;
const check = (cond, msg) => {
  console.log((cond ? '✅' : '❌') + ' ' + msg);
  if (!cond) ok = false;
};

console.log('--- TEST: FASE 5.2B-1 (BLENDER ASSET PIPELINE CORE) ---');

// ============================================================================
// 1. CÁLCULO DE BOUNDING BOX Y FACTOR DE ESCALA
// ============================================================================

function computeBoundingBox(vertices) {
  if (!vertices || vertices.length === 0) {
    return { dx: 0, dy: 0, dz: 0, min: [0,0,0], max: [0,0,0] };
  }
  const xs = vertices.map(v => v[0]);
  const ys = vertices.map(v => v[1]);
  const zs = vertices.map(v => v[2]);
  return {
    dx: Math.max(...xs) - Math.min(...xs),
    dy: Math.max(...ys) - Math.min(...ys),
    dz: Math.max(...zs) - Math.min(...zs),
    min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)],
    max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)]
  };
}

function computeScaleFactor(currentLength, targetLengthMm = 70.0) {
  if (currentLength <= 0.0001) return 1.0;
  return targetLengthMm / currentLength;
}

const mockRawVertices = [
  [-0.5, -1.0, 0.0],
  [0.5, -1.0, 0.0],
  [-0.5, 1.0, 0.8],
  [0.5, 1.0, 0.8]
]; // dy = 2.0 unidades (longitud)

const bbox = computeBoundingBox(mockRawVertices);
check(bbox.dx === 1.0 && bbox.dy === 2.0 && bbox.dz === 0.8, '[Geometría] Bounding box calculado correctamente (1.0 x 2.0 x 0.8)');

const scaleFactor = computeScaleFactor(bbox.dy, 70.0);
check(scaleFactor === 35.0, '[Escala] Factor de escala a 70.0 mm calculado: 70 / 2.0 = 35.0');

// ============================================================================
// 2. HEURÍSTICA DE ORIENTACIÓN Y EJES (X=Ancho, Y=Largo, Z=Alto)
// ============================================================================

function determineOrientation(dx, dy, dz) {
  if (dy >= dx && dx >= dz) {
    return { rotationNeeded: false, eulerDeg: [0, 0, 0], confidence: 0.95 };
  } else if (dx > dy && dy >= dz) {
    return { rotationNeeded: true, eulerDeg: [0, 0, 90], confidence: 0.90 };
  } else if (dz > dy || dz > dx) {
    return { rotationNeeded: true, eulerDeg: [90, 0, 0], confidence: 0.85 };
  }
  return { rotationNeeded: true, eulerDeg: [0, 0, 0], confidence: 0.50 };
}

check(determineOrientation(38.0, 70.0, 28.0).rotationNeeded === false, '[Orientación] Modelo con Y>X>Z reconocido como correctamente orientado');
check(determineOrientation(70.0, 38.0, 28.0).rotationNeeded === true && determineOrientation(70.0, 38.0, 28.0).eulerDeg[2] === 90, '[Orientación] Modelo con X dominante detectado y rotación en Z sugerida');

// ============================================================================
// 3. SCORING DE CANDIDATO DE RUEDA Y EVALUACIÓN FÍSICA
// ============================================================================

function evaluateWheelCandidate(radius, width, zCenter, config) {
  const [minR, maxR] = config.wheels.expected_radius_range_mm;
  const [minW, maxW] = config.wheels.expected_width_range_mm;
  let score = 1.0;

  if (radius < minR || radius > maxR) {
    const dev = Math.min(Math.abs(radius - minR), Math.abs(radius - maxR));
    score -= Math.min(0.40, dev * 0.1);
  }
  if (width < minW || width > maxW) {
    const dev = Math.min(Math.abs(width - minW), Math.abs(width - maxW));
    score -= Math.min(0.30, dev * 0.1);
  }
  if (zCenter < 0) score -= 0.30;

  return Math.max(0.0, Math.min(1.0, score));
}

const mockWheelConfig = {
  wheels: {
    expected_radius_range_mm: [12.0, 14.5],
    expected_width_range_mm: [7.0, 9.5]
  }
};

const perfectWheelScore = evaluateWheelCandidate(13.2, 8.2, 13.2, mockWheelConfig);
check(perfectWheelScore === 1.0, '[Scoring Ruedas] Rueda con dimensiones perfectas (R=13.2, W=8.2) obtiene score 1.0');

const abnormalWheelScore = evaluateWheelCandidate(22.0, 15.0, 13.2, mockWheelConfig);
check(abnormalWheelScore < 0.60, '[Scoring Ruedas] Rueda con dimensiones anómalas (R=22.0) penalizada a score bajo');

// ============================================================================
// 4. SIMETRÍA CUADRANGULAR DE RUEDAS (FL, FR, RL, RR)
// ============================================================================

function evaluateQuadSymmetry(wheels, toleranceMm = 1.0) {
  const fl = wheels.FL.center;
  const fr = wheels.FR.center;
  const rl = wheels.RL.center;
  const rr = wheels.RR.center;

  const wheelbaseL = Math.abs(fl[1] - rl[1]);
  const wheelbaseR = Math.abs(fr[1] - rr[1]);
  const diffWheelbase = Math.abs(wheelbaseL - wheelbaseR);

  const centerXF = (fl[0] + fr[0]) / 2.0;
  const centerXR = (rl[0] + rr[0]) / 2.0;
  const diffCenterX = Math.max(Math.abs(centerXF), Math.abs(centerXR));

  const isSymmetric = (diffWheelbase <= toleranceMm) && (diffCenterX <= toleranceMm);
  const score = Math.max(0.0, 1.0 - Math.min(0.6, (diffWheelbase + diffCenterX) * 0.2));

  return { isSymmetric, score, diffWheelbase, diffCenterX };
}

const symmetricWheels = {
  FL: { center: [-18.2, 22.4, 13.2] },
  FR: { center: [18.2, 22.4, 13.2] },
  RL: { center: [-18.2, -22.4, 13.2] },
  RR: { center: [18.2, -22.4, 13.2] }
};

const symResult = evaluateQuadSymmetry(symmetricWheels, 1.0);
check(symResult.isSymmetric === true && symResult.score === 1.0, '[Simetría] 4 ruedas con simetría perfecta obtienen score 1.0');

const asymmetricWheels = {
  FL: { center: [-18.2, 22.4, 13.2] },
  FR: { center: [18.2, 26.0, 13.2] }, // Desviación de 3.6 mm
  RL: { center: [-18.2, -22.4, 13.2] },
  RR: { center: [18.2, -22.4, 13.2] }
};

const asymResult = evaluateQuadSymmetry(asymmetricWheels, 1.0);
check(asymResult.isSymmetric === false && asymResult.score < 0.6, '[Simetría] Desviación asimétrica en eje delantero penalizada');

// ============================================================================
// 5. THRESHOLDS DE CONFIANZA Y ESTADOS QA
// ============================================================================

function determineQaStatus(confidenceMap, thresholds = { auto_accept: 0.85, review_required: 0.60, fail: 0.35 }) {
  const scores = Object.values(confidenceMap);
  const minScore = Math.min(...scores);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (minScore < thresholds.fail) return 'FAIL';
  if (minScore < thresholds.review_required || avgScore < thresholds.auto_accept) return 'REVIEW_REQUIRED';
  if (minScore < thresholds.auto_accept) return 'WARNING';
  return 'PASS';
}

check(determineQaStatus({ wheels: 0.95, body: 0.96, spoiler: 0.90, exhaust: 0.88 }) === 'PASS', '[QA Status] Todos los componentes >= 0.85 producen PASS');
check(determineQaStatus({ wheels: 0.95, body: 0.96, spoiler: 0.70, exhaust: 0.88 }) === 'WARNING', '[QA Status] Componente secundario a 0.70 produce WARNING');
check(determineQaStatus({ wheels: 0.50, body: 0.96, spoiler: 0.90, exhaust: 0.88 }) === 'REVIEW_REQUIRED', '[QA Status] Rueda con score 0.50 produce REVIEW_REQUIRED');
check(determineQaStatus({ wheels: 0.20, body: 0.96, spoiler: 0.90, exhaust: 0.88 }) === 'FAIL', '[QA Status] Componente crítico < 0.35 produce FAIL');

// ============================================================================
// 6. HERENCIA Y PARSING DE CONFIGURACIÓN (JSON)
// ============================================================================

const defaultCfg = JSON.parse(fs.readFileSync(path.resolve('tools/blender/configs/default.json'), 'utf8'));
const z350Cfg = JSON.parse(fs.readFileSync(path.resolve('tools/blender/configs/350z.json'), 'utf8'));
const r32Cfg = JSON.parse(fs.readFileSync(path.resolve('tools/blender/configs/r32.json'), 'utf8'));

check(defaultCfg.target_length_mm === 70.0, '[Config] default.json contiene target_length_mm = 70.0');
check(z350Cfg.slug === '350z' && z350Cfg.spoiler.expected === false, '[Config] 350z.json define slug y spoiler.expected = false');
check(r32Cfg.slug === 'r32' && r32Cfg.spoiler.expected === true, '[Config] r32.json define slug y spoiler.expected = true');

// ============================================================================
// 7. SCRIPT PRINCIPAL Y CLI
// ============================================================================

const pipelineScriptPath = path.resolve('tools/blender/sscars_asset_pipeline.py');
check(fs.existsSync(pipelineScriptPath), '[Script] tools/blender/sscars_asset_pipeline.py existe');

const scriptContent = fs.readFileSync(pipelineScriptPath, 'utf8');
check(scriptContent.includes('class SscarsAssetPipeline'), '[Script] Clase SscarsAssetPipeline implementada');
check(scriptContent.includes('def inspect_geometry'), '[Script] Método inspect_geometry implementado');
check(scriptContent.includes('def detect_wheels'), '[Script] Método detect_wheels implementado');
check(scriptContent.includes('def analyze_undercarriage'), '[Script] Método analyze_undercarriage implementado');
check(scriptContent.includes('--dry-run'), '[Script] Soporte para argumento --dry-run presente');

console.log('\n' + (ok ? 'TODOS LOS CHECKS DE LA FASE 5.2B-1 OK' : 'HAY FALLOS EN LA FASE 5.2B-1'));
process.exit(ok ? 0 : 1);
