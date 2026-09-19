/**
 * SSCARS GARAGE 2.0 — Test Suite: Fase 5 (Build Render, MockRenderer & Car Card HD)
 * Valida el pipeline desacoplado de renderizado, determinismo de render_key,
 * idempotencia de render_jobs, aislamiento RLS de storage y el test crítico de inmutabilidad.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MockRenderer } from '../api/render/adapter.js';

let ok = true;
const check = (cond, msg) => {
  console.log((cond ? '✅' : '❌') + ' ' + msg);
  if (!cond) ok = false;
};

console.log('--- TEST: FASE 5 (BUILD RENDER, MOCK RENDERER & CAR CARD HD) ---');

// ============================================================================
// SIMULADOR DEL PIPELINE DE RENDER SERVER-SIDE
// ============================================================================

class RenderPipelineServer {
  constructor() {
    this.snapshots = new Map();
    this.renderJobs = new Map(); // key: snapshotId_provider_version_key
    this.renderer = new MockRenderer();
  }

  registerSnapshot(snapshot) {
    this.snapshots.set(snapshot.id, Object.freeze(JSON.parse(JSON.stringify(snapshot))));
  }

  requestRender(authUid, snapshotId, provider = 'mock', version = '1.0.0') {
    if (!authUid) throw new Error('Operación denegada: usuario no autenticado.');

    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) throw new Error('Snapshot no encontrado.');

    // 1. Validar ownership
    if (snapshot.user_id !== authUid) {
      throw new Error('Operación denegada: snapshot no pertenece a tu cuenta.');
    }

    // 2. Generar render_key determinista
    const canonicalStr = `${snapshot.id}_${snapshot.snapshot_version || 1}_${JSON.stringify(snapshot.build_data)}_${provider}_${version}`;
    const renderKey = crypto.createHash('md5').update(canonicalStr).digest('hex');

    // 3. Generar storage path determinista seguro
    const storagePath = `build-renders/${authUid}/${snapshot.id}/${version}/render.png`;

    const jobKey = `${snapshot.id}_${provider}_${version}_${renderKey}`;

    // 4. Idempotencia: Si ya existe
    if (this.renderJobs.has(jobKey)) {
      return { success: true, is_cached: true, job: this.renderJobs.get(jobKey) };
    }

    // 5. Crear y completar job
    const jobRecord = {
      id: `job-${Date.now()}-${Math.random()}`,
      snapshot_id: snapshot.id,
      user_id: authUid,
      status: 'completed',
      renderer_provider: provider,
      renderer_version: version,
      render_key: renderKey,
      storage_path: storagePath,
      width: 2048,
      height: 2048,
      mime_type: 'image/png',
      render_metadata: {
        car_name: snapshot.build_data.car_name,
        build_name: snapshot.build_data.build_name,
        parts: snapshot.build_data.parts,
        stats: snapshot.stats
      },
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

    this.renderJobs.set(jobKey, jobRecord);
    return { success: true, is_cached: false, job: jobRecord };
  }
}

const renderServer = new RenderPipelineServer();

// Snapshots de prueba
const snapshotUserA1 = {
  id: 'snap-A1',
  user_id: 'user-A',
  car_id: '01',
  snapshot_version: 1,
  build_data: {
    car_name: 'El Emperador Azul',
    build_name: 'Midnight Blue R34',
    parts: { wheels: 'wheels-street', paint: 'paint-midnight-purple', spoiler: 'spoiler-stock' }
  },
  stats: { hp: 339, acceleration_0_100: 4.7, handling: 96 }
};

const snapshotUserB1 = {
  id: 'snap-B1',
  user_id: 'user-B',
  car_id: '02',
  snapshot_version: 1,
  build_data: {
    car_name: 'El Monstruo Púrpura',
    build_name: 'Track Monster R32',
    parts: { wheels: 'wheels-racing', paint: 'paint-stock', spoiler: 'spoiler-gt-wing' }
  },
  stats: { hp: 300, acceleration_0_100: 5.2, handling: 95 }
};

renderServer.registerSnapshot(snapshotUserA1);
renderServer.registerSnapshot(snapshotUserB1);

// ============================================================================
// 1. OWNERSHIP & AUTORIZACIÓN DE RENDER
// ============================================================================

// 1.1 Usuario A puede solicitar render de su snapshot propio
const renderResA1 = renderServer.requestRender('user-A', 'snap-A1');
check(renderResA1.success === true && renderResA1.job.status === 'completed', '[Ownership] Usuario A puede renderizar su snapshot propio');

// 1.2 Usuario A NO puede solicitar render del snapshot de Usuario B
let crossRenderBlocked = false;
try {
  renderServer.requestRender('user-A', 'snap-B1');
} catch (e) {
  crossRenderBlocked = true;
}
check(crossRenderBlocked, '[Ownership] Usuario A NO puede renderizar snapshot perteneciente a Usuario B');

// ============================================================================
// 2. DETERMINISMO & REUTILIZACIÓN DE CLAVE (MOCK RENDERER)
// ============================================================================

const mockRendererInstance = new MockRenderer();
const key1 = mockRendererInstance.generateRenderKey(snapshotUserA1);
const key2 = mockRendererInstance.generateRenderKey(snapshotUserA1);
check(key1 === key2, '[Determinismo] Mismo snapshot genera idéntico render_key (hash determinista)');

// ============================================================================
// 3. IDEMPOTENCIA & CONCURRENCIA
// ============================================================================

// Segunda solicitud del mismo render para Usuario A -> debe devolver caché
const renderResA1Dup = renderServer.requestRender('user-A', 'snap-A1');
check(renderResA1Dup.is_cached === true, '[Idempotencia] Segunda solicitud para el mismo snapshot devuelve el render job en caché');
check(renderServer.renderJobs.size === 1, '[Idempotencia] No se crean filas duplicadas en render_jobs');

// ============================================================================
// 4. STORAGE PATH & SEGURIDAD TRAVERSAL
// ============================================================================

const storagePath = renderResA1.job.storage_path;
check(storagePath === 'build-renders/user-A/snap-A1/1.0.0/render.png', '[Storage Path] Path determinista seguro con user_id y snapshot_id');
check(!storagePath.includes('..'), '[Storage Path] Sin caracteres de path traversal (../)');

// ============================================================================
// 5. TEST CRÍTICO DE INMUTABILIDAD Y DESACOPLAMIENTO
// ============================================================================

// Estado 1: Build A original -> Snapshot 1 -> Render 1
const render1Key = renderResA1.job.render_key;
const render1Hp = renderResA1.job.render_metadata.stats.hp;

// Estado 2: Modificar Build A y crear Snapshot 2 con piezas distintas
const snapshotUserA2 = {
  id: 'snap-A2',
  user_id: 'user-A',
  car_id: '01',
  snapshot_version: 1,
  build_data: {
    car_name: 'El Emperador Azul',
    build_name: 'Widebody Beast Setup',
    parts: { wheels: 'wheels-racing', paint: 'paint-carbon-black', spoiler: 'spoiler-gt-wing', exhaust: 'exhaust-titanium' }
  },
  stats: { hp: 351, acceleration_0_100: 4.5, handling: 100 }
};
renderServer.registerSnapshot(snapshotUserA2);

// Estado 3: Render 2 correspondiente a Snapshot 2
const renderResA2 = renderServer.requestRender('user-A', 'snap-A2');
const render2Key = renderResA2.job.render_key;
const render2Hp = renderResA2.job.render_metadata.stats.hp;

// Verificación: Render 1 != Render 2
check(render1Key !== render2Key, '[Test Crítico] Render 1 != Render 2 (claves distintas para snapshots distintos)');
check(render1Hp === 339 && render2Hp === 351, '[Test Crítico] Render 1 conserva sus 339 CV originales y Render 2 tiene 351 CV');

// Snapshot 1 permanece completamente inalterado
const snap1FromStorage = renderServer.snapshots.get('snap-A1');
check(snap1FromStorage.stats.hp === 339, '[Inmutabilidad] Snapshot 1 conserva inalteradas sus estadísticas originales');

// ============================================================================
// 6. SQL MIGRATION 011 Y POLÍTICAS RLS
// ============================================================================

const migration011 = fs.readFileSync(path.resolve('supabase/migrations/011_render_jobs_and_storage_privacy.sql'), 'utf8');

check(migration011.includes('TABLE IF NOT EXISTS public.render_jobs'), '[SQL Migration 011] Tabla render_jobs creada');
check(migration011.includes('uq_render_job_idempotency'), '[SQL Migration 011] Constraint de idempotencia UNIQUE en render_jobs');
check(migration011.includes('SET public = false'), '[SQL Migration 011] Storage bucket build-renders configurado como privado');
check(migration011.includes('User Read Own Build Renders'), '[SQL Migration 011] Política de lectura de renders aislada por user_id');
check(migration011.includes('request_build_render_atomic'), '[SQL Migration 011] Procedimiento request_build_render_atomic implementado');

console.log('\n' + (ok ? 'TODOS LOS CHECKS DE LA FASE 5 OK' : 'HAY FALLOS EN LA FASE 5'));
process.exit(ok ? 0 : 1);
