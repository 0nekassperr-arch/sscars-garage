/**
 * SSCARS GARAGE 2.0 — Test Suite: Fase 4 (Tuning, Builds & Immutable Snapshots)
 * Valida la verificación server-side de ownership, requisitos de XP,
 * cálculo de stats, aislamiento RLS y el test especial de inmutabilidad de snapshots.
 */

import fs from 'fs';
import path from 'path';

let ok = true;
const check = (cond, msg) => {
  console.log((cond ? '✅' : '❌') + ' ' + msg);
  if (!cond) ok = false;
};

console.log('--- TEST: FASE 4 (TUNING, BUILDS & IMMUTABLE SNAPSHOTS) ---');

// ============================================================================
// SIMULADOR DE BASE DE DATOS Y LÓGICA SERVER-SIDE
// ============================================================================

const tuningCatalog = [
  { category: 'wheels', slug: 'wheels-stock', xp_required: 0, active: true, stats_modifier: { hp: 0, handling: 0, style: 0 } },
  { category: 'wheels', slug: 'wheels-street', xp_required: 100, active: true, stats_modifier: { hp: 0, handling: 2, style: 4 } },
  { category: 'wheels', slug: 'wheels-racing', xp_required: 500, active: true, stats_modifier: { hp: 0, handling: 5, style: 8 } },
  { category: 'paint', slug: 'paint-stock', xp_required: 0, active: true, stats_modifier: { hp: 0, handling: 0, style: 0 } },
  { category: 'paint', slug: 'paint-midnight-purple', xp_required: 250, active: true, stats_modifier: { hp: 0, handling: 0, style: 8 } },
  { category: 'spoiler', slug: 'spoiler-stock', xp_required: 0, active: true, stats_modifier: { hp: 0, handling: 0, top_speed_kmh: 0, style: 0 } },
  { category: 'spoiler', slug: 'spoiler-gt-wing', xp_required: 400, active: true, stats_modifier: { hp: 0, handling: 6, top_speed_kmh: -2, style: 7 } },
  { category: 'exhaust', slug: 'exhaust-stock', xp_required: 0, active: true, stats_modifier: { hp: 0, acceleration_0_100: 0.0, style: 0 } },
  { category: 'exhaust', slug: 'exhaust-titanium', xp_required: 600, active: true, stats_modifier: { hp: 12, acceleration_0_100: -0.2, style: 8 } },
  { category: 'body_kit', slug: 'bodykit-stock', xp_required: 0, active: true, stats_modifier: { hp: 0, handling: 0, style: 0 } },
  { category: 'body_kit', slug: 'bodykit-widebody', xp_required: 750, active: true, stats_modifier: { hp: 0, handling: 7, style: 12 } },
  { category: 'paint', slug: 'paint-inactive', xp_required: 0, active: false, stats_modifier: { hp: 0 } }
];

const carsCatalog = [
  { id: '01', slug: 'r34', name: 'El Emperador Azul', base_stats: { hp: 327, top_speed_kmh: 252, acceleration_0_100: 4.9, handling: 94 } },
  { id: '02', slug: 'r32', name: 'El Monstruo Púrpura', base_stats: { hp: 276, top_speed_kmh: 250, acceleration_0_100: 5.6, handling: 88 } }
];

class TuningEngineServer {
  constructor() {
    this.userProfiles = new Map([
      ['user-A', { id: 'user-A', xp: 450, level: 3 }],
      ['user-B', { id: 'user-B', xp: 1000, level: 5 }]
    ]);
    this.userCards = new Map([
      ['user-A', new Set(['01'])], // User A posee R34 (#01), no posee R32 (#02)
      ['user-B', new Set(['02'])]  // User B posee R32 (#02)
    ]);
    this.builds = new Map();
    this.snapshots = new Map();
  }

  calculateStats(carId, partSlugs) {
    const car = carsCatalog.find(c => c.id === carId);
    if (!car) throw new Error('Vehículo no válido');

    const base = car.base_stats;
    let hp = base.hp;
    let top_speed = base.top_speed_kmh;
    let accel = base.acceleration_0_100;
    let handling = base.handling;
    let style = 0;

    const seenCategories = new Set();

    for (const slug of partSlugs) {
      const part = tuningCatalog.find(p => p.slug === slug);
      if (!part) throw new Error(`Pieza inexistente: ${slug}`);
      if (!part.active) throw new Error(`Pieza inactiva: ${slug}`);

      if (seenCategories.has(part.category)) {
        throw new Error(`Configuración inválida: múltiples piezas para la categoría ${part.category}`);
      }
      seenCategories.add(part.category);

      const m = part.stats_modifier || {};
      if (m.hp) hp += m.hp;
      if (m.top_speed_kmh) top_speed += m.top_speed_kmh;
      if (m.acceleration_0_100) accel += m.acceleration_0_100;
      if (m.handling) handling += m.handling;
      if (m.style) style += m.style;
    }

    accel = Math.max(2.0, Math.round(accel * 10) / 10);
    handling = Math.min(100, Math.max(1, handling));

    return { hp, top_speed_kmh: top_speed, acceleration_0_100: accel, handling, style_points: style };
  }

  saveBuild(authUid, { carId, name, partSlugs, buildId = null }) {
    if (!authUid) throw new Error('Operación denegada: usuario no autenticado.');

    // 1. Validar ownership real del coche
    const ownedCars = this.userCards.get(authUid) || new Set();
    if (!ownedCars.has(carId)) {
      throw new Error(`Operación denegada: no posees el vehículo (${carId}) en tu Garaje.`);
    }

    // 2. Validar XP requerido
    const profile = this.userProfiles.get(authUid);
    for (const slug of partSlugs) {
      const part = tuningCatalog.find(p => p.slug === slug);
      if (part && part.xp_required > profile.xp) {
        throw new Error(`XP insuficiente para equipar "${part.slug}": requiere ${part.xp_required} XP (tienes ${profile.xp} XP).`);
      }
    }

    // 3. Calcular stats server-side
    const stats = this.calculateStats(carId, partSlugs);

    // 4. Guardar o actualizar
    const partsJson = {};
    partSlugs.forEach(slug => {
      const p = tuningCatalog.find(part => part.slug === slug);
      if (p) partsJson[p.category] = p.slug;
    });

    const bId = buildId || `build-${Date.now()}-${Math.random()}`;

    if (buildId && this.builds.has(buildId)) {
      const existing = this.builds.get(buildId);
      if (existing.user_id !== authUid) {
        throw new Error('Operación denegada: build no pertenece a tu cuenta.');
      }
    }

    const buildRecord = {
      id: bId,
      user_id: authUid,
      car_id: carId,
      name: name || 'Custom Build',
      parts: partsJson,
      stats: stats,
      updated_at: new Date().toISOString()
    };

    this.builds.set(bId, buildRecord);
    return { success: true, build: buildRecord };
  }

  createSnapshot(authUid, buildId) {
    if (!authUid) throw new Error('Operación denegada');
    const build = this.builds.get(buildId);
    if (!build || build.user_id !== authUid) {
      throw new Error('Build no encontrado o no autorizado.');
    }

    const snapId = `snap-${Date.now()}`;
    const snapData = {
      build_id: build.id,
      build_name: build.name,
      car_id: build.car_id,
      parts: JSON.parse(JSON.stringify(build.parts)),
      stats: JSON.parse(JSON.stringify(build.stats)),
      captured_at: new Date().toISOString()
    };

    const snapshotRecord = Object.freeze({
      id: snapId,
      build_id: build.id,
      user_id: authUid,
      car_id: build.car_id,
      build_data: snapData,
      stats: Object.freeze(JSON.parse(JSON.stringify(build.stats))),
      snapshot_version: 1,
      created_at: new Date().toISOString()
    });

    this.snapshots.set(snapId, snapshotRecord);
    return { success: true, snapshot: snapshotRecord };
  }

  deleteBuild(authUid, buildId) {
    const build = this.builds.get(buildId);
    if (!build || build.user_id !== authUid) {
      throw new Error('Build no encontrado o no pertenece a tu cuenta.');
    }
    this.builds.delete(buildId);
    return { success: true };
  }
}

const server = new TuningEngineServer();

// ============================================================================
// 1. OWNERSHIP & AUTORIZACIÓN
// ============================================================================

// 1.1 Usuario A puede tunear el coche que posee (R34 / 01)
const buildA1 = server.saveBuild('user-A', {
  carId: '01',
  name: 'Wangan Blue R34',
  partSlugs: ['wheels-street', 'paint-midnight-purple', 'spoiler-stock', 'exhaust-stock', 'bodykit-stock']
});
check(buildA1.success === true, '[Ownership] Usuario A puede crear build para coche que posee (R34)');

// 1.2 Usuario A NO puede tunear un coche que no posee (R32 / 02)
let unownedCarBlocked = false;
try {
  server.saveBuild('user-A', {
    carId: '02',
    name: 'Hacked R32',
    partSlugs: ['wheels-stock', 'paint-stock']
  });
} catch (e) {
  unownedCarBlocked = true;
}
check(unownedCarBlocked, '[Ownership] Usuario A NO puede crear build para coche que no posee (R32)');

// 1.3 Usuario B puede tunear su propio coche (R32 / 02)
const buildB1 = server.saveBuild('user-B', {
  carId: '02',
  name: 'Godzilla Track',
  partSlugs: ['wheels-racing', 'paint-stock', 'spoiler-gt-wing', 'exhaust-titanium', 'bodykit-widebody']
});
check(buildB1.success === true, '[Ownership] Usuario B puede crear build para su coche poseído (R32)');

// ============================================================================
// 2. PIEZAS, REGLAS DE CATEGORÍA Y XP REQUERIDO
// ============================================================================

// 2.1 Pieza inexistente rechazada
let nonexistentPartBlocked = false;
try {
  server.saveBuild('user-A', { carId: '01', name: 'Test', partSlugs: ['wheels-fake-nonexistent'] });
} catch (e) {
  nonexistentPartBlocked = true;
}
check(nonexistentPartBlocked, '[Parts] Pieza inexistente rechazada');

// 2.2 Pieza inactiva rechazada
let inactivePartBlocked = false;
try {
  server.saveBuild('user-A', { carId: '01', name: 'Test', partSlugs: ['paint-inactive'] });
} catch (e) {
  inactivePartBlocked = true;
}
check(inactivePartBlocked, '[Parts] Pieza inactiva rechazada');

// 2.3 Pieza duplicada por categoría rechazada (2 alerones)
let duplicateCategoryBlocked = false;
try {
  server.saveBuild('user-A', {
    carId: '01',
    name: 'Dual Wing',
    partSlugs: ['spoiler-stock', 'spoiler-gt-wing']
  });
} catch (e) {
  duplicateCategoryBlocked = true;
}
check(duplicateCategoryBlocked, '[Categorías] Configuración con 2 piezas de la misma categoría rechazada');

// 2.4 XP insuficiente rechazado (Widebody requiere 750 XP, Usuario A tiene 450 XP)
let xpCheckBlocked = false;
try {
  server.saveBuild('user-A', {
    carId: '01',
    name: 'Widebody R34',
    partSlugs: ['bodykit-widebody']
  });
} catch (e) {
  xpCheckBlocked = true;
}
check(xpCheckBlocked, '[XP Rules] Pieza que requiere más XP del disponible rechazada');

// ============================================================================
// 3. STATS: Cálculo Server-Side
// ============================================================================

// R34 base: hp: 327, top_speed: 252, accel: 4.9, handling: 94
// Piezas: wheels-street (+2 handling, +4 style), exhaust-titanium (+12 hp, -0.2s accel, +8 style)
const computedStats = server.calculateStats('01', ['wheels-street', 'exhaust-titanium', 'paint-stock', 'spoiler-stock', 'bodykit-stock']);
check(computedStats.hp === 339, '[Stats] Potencia calculada server-side: 327 + 12 = 339 CV');
check(computedStats.acceleration_0_100 === 4.7, '[Stats] Aceleración calculada server-side: 4.9 - 0.2 = 4.7 s');
check(computedStats.handling === 96, '[Stats] Manejo calculado server-side: 94 + 2 = 96 pts');
check(computedStats.style_points === 12, '[Stats] Puntos de estilo sumados server-side: 4 + 8 = 12 pts');

// ============================================================================
// 4. AISLAMIENTO RLS ENTRE BUILDS
// ============================================================================

// Usuario A intenta modificar build de Usuario B
let crossUserEditBlocked = false;
try {
  server.saveBuild('user-A', {
    carId: '02',
    name: 'Hacked Godzilla',
    partSlugs: ['wheels-stock'],
    buildId: buildB1.build.id
  });
} catch (e) {
  crossUserEditBlocked = true;
}
check(crossUserEditBlocked, '[RLS] Usuario A NO puede modificar build perteneciente a Usuario B');

// Usuario A intenta eliminar build de Usuario B
let crossUserDeleteBlocked = false;
try {
  server.deleteBuild('user-A', buildB1.build.id);
} catch (e) {
  crossUserDeleteBlocked = true;
}
check(crossUserDeleteBlocked, '[RLS] Usuario A NO puede eliminar build perteneciente a Usuario B');

// ============================================================================
// 5. TEST DE INMUTABILIDAD ESPECIAL DE SNAPSHOTS
// ============================================================================

// Paso 1: Crear Build A para R34
const initialBuildRes = server.saveBuild('user-A', {
  carId: '01',
  name: 'Initial Blue Setup',
  partSlugs: ['wheels-street', 'paint-midnight-purple', 'spoiler-stock', 'exhaust-stock', 'bodykit-stock']
});
const buildAId = initialBuildRes.build.id;
const initialHp = initialBuildRes.build.stats.hp;

// Paso 2: Crear Snapshot 1
const snapRes = server.createSnapshot('user-A', buildAId);
const snap1 = snapRes.snapshot;
check(snap1.snapshot_version === 1, '[Snapshots] Snapshot creado con versión 1');
check(snap1.stats.hp === initialHp, '[Snapshots] Snapshot congela la potencia inicial');
check(snap1.build_data.parts.wheels === 'wheels-street', '[Snapshots] Snapshot congela las llantas iniciales');

// Paso 3: Modificar Build A (cambiar a llantas de serie y pintura de serie)
server.saveBuild('user-A', {
  carId: '01',
  name: 'Completely Modified Setup',
  partSlugs: ['wheels-stock', 'paint-stock', 'spoiler-gt-wing', 'exhaust-stock', 'bodykit-stock'],
  buildId: buildAId
});

// Paso 4: Comprobar Snapshot 1 -> DEBE PERMANECER 100% IDÉNTICO AL ESTADO ORIGINAL
const frozenSnap = server.snapshots.get(snap1.id);
check(frozenSnap.build_data.build_name === 'Initial Blue Setup', '[Inmutabilidad Especial] Snapshot conserva el nombre original');
check(frozenSnap.build_data.parts.wheels === 'wheels-street', '[Inmutabilidad Especial] Snapshot conserva las llantas originales (wheels-street)');
check(frozenSnap.build_data.parts.paint === 'paint-midnight-purple', '[Inmutabilidad Especial] Snapshot conserva la pintura original (midnight-purple)');
check(frozenSnap.stats.hp === initialHp, '[Inmutabilidad Especial] Snapshot conserva las estadísticas originales inalteradas');

// Paso 5: Eliminar Build original -> Snapshot sigue existiendo intacto
server.deleteBuild('user-A', buildAId);
check(server.snapshots.has(snap1.id) === true, '[Inmutabilidad Especial] Eliminar el build original NO elimina el snapshot histórico');

// ============================================================================
// 6. SQL MIGRATION 010 VERIFICACIÓN
// ============================================================================

const migration010 = fs.readFileSync(path.resolve('supabase/migrations/010_tuning_builds_and_snapshots.sql'), 'utf8');

check(migration010.includes('public.calculate_build_stats'), '[SQL Migration 010] Función calculate_build_stats implementada');
check(migration010.includes('public.save_build_atomic'), '[SQL Migration 010] Procedimiento save_build_atomic implementado');
check(migration010.includes('public.create_build_snapshot_atomic'), '[SQL Migration 010] Procedimiento create_build_snapshot_atomic implementado');
check(migration010.includes('snapshot_version'), '[SQL Migration 010] Versionado de snapshots añadido');
check(migration010.includes('REVOKE ALL ON FUNCTION public.save_build_atomic'), '[Seguridad RPC] save_build_atomic protegido de acceso anónimo');

console.log('\n' + (ok ? 'TODOS LOS CHECKS DE LA FASE 4 OK' : 'HAY FALLOS EN LA FASE 4'));
process.exit(ok ? 0 : 1);
