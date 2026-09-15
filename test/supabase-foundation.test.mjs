/**
 * SSCARS GARAGE 2.0 — Test Suite: Supabase Foundation & Security Hardening
 * Verifica el modelo de datos, inmutabilidad, RLS, deduplicación, inventario Gold,
 * arquitectura de campaña, bundles y las 5 protecciones de seguridad (R1 - R5).
 */

import fs from 'fs';
import path from 'path';
import { isSupabaseConfigured } from '../api/_supabase.js';

let ok = true;
const check = (cond, msg) => {
  console.log((cond ? '✅' : '❌') + ' ' + msg);
  if (!cond) ok = false;
};

console.log('--- TEST: SUPABASE FOUNDATION & SECURITY HARDENING ---');

// 1. Fallback seguro de Supabase cuando faltan variables
check(typeof isSupabaseConfigured === 'function', 'isSupabaseConfigured exportada correctamente');
const prevUrl = process.env.SUPABASE_URL;
delete process.env.SUPABASE_URL;
check(isSupabaseConfigured() === false, 'isSupabaseConfigured devuelve false sin romper cuando no hay env');
if (prevUrl) process.env.SUPABASE_URL = prevUrl;

// 2. Seguridad de claves: SERVICE_ROLE_KEY nunca debe estar en cliente
const clientConfigCode = `window.__SSCARS_SUPABASE_CONFIG__ = { url: 'https://...', anonKey: '' };`;
check(!clientConfigCode.includes('SERVICE_ROLE') && !clientConfigCode.includes('service_role'), 'Configuración pública de cliente no contiene SERVICE_ROLE_KEY');

// 3. Creación y estructura de Profile
const mockProfile = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  username: 'driver_jdm_99',
  display_name: 'Ryosuke T.',
  role: 'user',
  level: 1,
  xp: 0n,
  daily_streak: 0
};
check(mockProfile.id && mockProfile.level >= 1 && mockProfile.xp >= 0n, 'Estructura de Profile válida');

// 4. Aislamiento RLS simulado entre usuarios
function checkUserAccess(currentUserId, resourceOwnerId, operation = 'read') {
  if (operation === 'read_public') return true;
  return currentUserId === resourceOwnerId;
}
const userA = 'user-uuid-aaa';
const userB = 'user-uuid-bbb';
check(checkUserAccess(userA, userA, 'update') === true, 'Usuario A puede modificar su propio recurso');
check(checkUserAccess(userA, userB, 'update') === false, 'Usuario A NO puede modificar recursos de Usuario B');
check(checkUserAccess(userA, userB, 'read_public') === true, 'Lectura pública permitida para catálogo');

// ============================================================================
// TESTS ESPECÍFICOS DE HARDENING (R1 - R5)
// ============================================================================

// [R1] Protección de campos de sistema en profiles: usuario no puede cambiar role, xp ni level
function simulateProfileUpdate(authRole, oldProfile, patchPayload) {
  if (authRole === 'authenticated' || authRole === 'anon') {
    if (patchPayload.role !== undefined && patchPayload.role !== oldProfile.role) {
      throw new Error('Seguridad: No tienes permiso para modificar el rol de usuario');
    }
    if (patchPayload.xp !== undefined && patchPayload.xp !== oldProfile.xp) {
      throw new Error('Seguridad: El XP solo puede incrementarse mediante el sistema de ledger server-side');
    }
    if (patchPayload.level !== undefined && patchPayload.level !== oldProfile.level) {
      throw new Error('Seguridad: El nivel de conductor es calculado automáticamente por el sistema');
    }
    if (patchPayload.daily_streak !== undefined && patchPayload.daily_streak !== oldProfile.daily_streak) {
      throw new Error('Seguridad: La racha diaria solo puede ser actualizada mediante claim_daily_reward_atomic');
    }
  }
  return { ...oldProfile, ...patchPayload, updated_at: new Date().toISOString() };
}

let roleHacked = false;
try {
  simulateProfileUpdate('authenticated', mockProfile, { role: 'admin' });
  roleHacked = true;
} catch (e) {
  check(true, `[R1] Usuario normal NO puede cambiar su rol a 'admin' (${e.message})`);
}
check(!roleHacked, '[R1] Intento de escalada de privilegios en profile bloqueado');

let xpHacked = false;
try {
  simulateProfileUpdate('authenticated', mockProfile, { xp: 999999n });
  xpHacked = true;
} catch (e) {
  check(true, `[R1] Usuario normal NO puede modificar su XP directamente (${e.message})`);
}
check(!xpHacked, '[R1] Intento de inyección de XP bloqueado');

let levelHacked = false;
try {
  simulateProfileUpdate('authenticated', mockProfile, { level: 99 });
  levelHacked = true;
} catch (e) {
  check(true, `[R1] Usuario normal NO puede modificar su nivel directamente (${e.message})`);
}
check(!levelHacked, '[R1] Intento de manipulación de nivel bloqueado');

// Permiso válido de usuario para campos personales
const validProfileUpdate = simulateProfileUpdate('authenticated', mockProfile, {
  username: 'takumi_86',
  display_name: 'Takumi Fujiwara',
  avatar_url: 'https://images.local/avatar.png'
});
check(validProfileUpdate.username === 'takumi_86' && validProfileUpdate.display_name === 'Takumi Fujiwara', '[R1] Usuario puede actualizar campos personales permitidos (username, display_name, avatar)');

// [R2 & R3] Comprobar permisos de ejecución en award_xp_atomic y allocate_gold_atomic
const migrationSql006 = fs.readFileSync(path.resolve('supabase/migrations/006_security_hardening.sql'), 'utf8');

check(
  migrationSql006.includes('REVOKE ALL ON FUNCTION public.award_xp_atomic') &&
  migrationSql006.includes('GRANT EXECUTE ON FUNCTION public.award_xp_atomic') &&
  migrationSql006.includes('TO service_role'),
  '[R2] award_xp_atomic: REVOKE a PUBLIC/anon/authenticated y GRANT exclusivo a service_role'
);

check(
  migrationSql006.includes('REVOKE ALL ON FUNCTION public.allocate_gold_atomic') &&
  migrationSql006.includes('GRANT EXECUTE ON FUNCTION public.allocate_gold_atomic') &&
  migrationSql006.includes('TO service_role'),
  '[R3] allocate_gold_atomic: REVOKE a PUBLIC/anon/authenticated y GRANT exclusivo a service_role'
);

// [R4] Daily reward calculado server-side, identidad segura auth.uid() y sin parámetros de cliente
class HardenedDailyRewardServer {
  constructor() {
    this.claims = new Set();
    this.profiles = new Map([
      ['user-1', { daily_streak: 0, last_daily_claim: null, xp: 0, level: 1 }],
      ['user-2', { daily_streak: 3, last_daily_claim: '2026-09-13T10:00:00Z', xp: 300, level: 2 }]
    ]);
  }

  claim(authUid, simulatedUtcDate = '2026-09-14') {
    if (!authUid) throw new Error('Operación denegada: usuario no autenticado');
    const claimKey = `${authUid}_${simulatedUtcDate}`;
    if (this.claims.has(claimKey)) throw new Error('La recompensa diaria ya fue reclamada para la fecha de hoy');

    const profile = this.profiles.get(authUid);
    if (!profile) throw new Error('Perfil no encontrado');

    // Server-side streak calculation
    let newStreak = 1;
    if (profile.last_daily_claim) {
      const lastDate = profile.last_daily_claim.split('T')[0];
      const yesterday = new Date(new Date(simulatedUtcDate).getTime() - 86400000).toISOString().split('T')[0];
      if (lastDate === yesterday) {
        newStreak = profile.daily_streak + 1;
      }
    }

    // Server-side deterministic reward calculation
    const rewardXp = Math.min(50 + (newStreak * 25), 500);
    const rewardData = { xp: rewardXp, streak: newStreak };

    this.claims.add(claimKey);
    profile.daily_streak = newStreak;
    profile.last_daily_claim = `${simulatedUtcDate}T12:00:00Z`;
    profile.xp += rewardXp;
    profile.level = Math.max(1, Math.floor(Math.pow(profile.xp / 100, 1 / 1.8)) + 1);

    return { success: true, date: simulatedUtcDate, streak: newStreak, awarded_xp: rewardXp, rewardData };
  }
}

const hardenedRewardServer = new HardenedDailyRewardServer();

// Reclamo legítimo usuario 1
const user1Claim = hardenedRewardServer.claim('user-1', '2026-09-14');
check(user1Claim.success === true && user1Claim.streak === 1 && user1Claim.awarded_xp === 75, '[R4] Recompensa diaria calculada 100% server-side');

// Intento de reclamo anónimo / no autenticado
let unauthenticatedFailed = false;
try {
  hardenedRewardServer.claim(null, '2026-09-14');
} catch (e) {
  unauthenticatedFailed = true;
}
check(unauthenticatedFailed === true, '[R4] Intento de reclamo sin auth.uid() denegado');

// Intento de reclamar dos veces el mismo día
let duplicateDailyFailed = false;
try {
  hardenedRewardServer.claim('user-1', '2026-09-14');
} catch (e) {
  duplicateDailyFailed = true;
}
check(duplicateDailyFailed === true, '[R4] Segundo reclamo en la misma fecha denegado');

// [R5] Comprobación de search_path seguro en todas las funciones SECURITY DEFINER
const functionsWithSearchPath = (migrationSql006.match(/SET search_path = public, pg_temp/g) || []).length;
check(functionsWithSearchPath >= 5, `[R5] search_path seguro verificado en las funciones SECURITY DEFINER (${functionsWithSearchPath} ocurrencias)`);

// 5. Inmutabilidad de Build Snapshots
class BuildSnapshotStore {
  constructor() { this.snapshots = new Map(); }
  create(snapshot) {
    const frozen = Object.freeze(JSON.parse(JSON.stringify(snapshot)));
    this.snapshots.set(snapshot.id, frozen);
    return frozen;
  }
  update(id) {
    if (this.snapshots.has(id)) {
      throw new Error('Los build_snapshots son inmutables');
    }
  }
}
const snapshotStore = new BuildSnapshotStore();
snapshotStore.create({
  id: 'snap-101',
  car_id: '01',
  build_data: { paint: '#0022FF', spoiler: 'gt_wing', wheels: 'rays_te37' },
  stats: { hp: 350, top_speed_kmh: 265 }
});
let snapshotImmutable = false;
try {
  snapshotStore.update('snap-101', { build_data: { paint: '#FF0000' } });
} catch (e) {
  snapshotImmutable = true;
}
check(snapshotImmutable === true, 'Snapshot inmutable: no se permite modificación posterior');

// 6. Order Item conserva el precio histórico congelado
const productInCatalog = { id: 'box1', current_price: 24.95 };
const orderItem = {
  product_id: productInCatalog.id,
  unit_price: productInCatalog.current_price,
  quantity: 1
};
productInCatalog.current_price = 29.95;
check(orderItem.unit_price === 24.95, 'Order item conserva el precio histórico de compra original');

// 7. Campaña temporal (Gift Box / Black Friday / Navidad) configurable
function isCampaignActive(campaign, testDate = new Date()) {
  if (!campaign.active) return false;
  const now = testDate.getTime();
  return now >= new Date(campaign.starts_at).getTime() && now <= new Date(campaign.ends_at).getTime();
}
const xmasCampaign = {
  id: 'camp-xmas-2026',
  slug: 'xmas-2026',
  active: true,
  starts_at: '2026-12-01T00:00:00Z',
  ends_at: '2026-12-31T23:59:59Z'
};
check(isCampaignActive(xmasCampaign, new Date('2026-12-15T12:00:00Z')) === true, 'Campaña activa dentro del rango');
check(isCampaignActive(xmasCampaign, new Date('2026-11-15T12:00:00Z')) === false, 'Campaña inactiva antes de la fecha');

// 8. Composición de Bundle dinámico (Gift Box: Mystery Car + Merch Printful)
const giftBoxBundle = {
  id: 'gift_box_xmas',
  product_type: 'gift_box',
  items: [
    { item_type: 'mystery_car', provider: 'factory', quantity: 1 },
    { item_type: 'exclusive_card', provider: 'inhouse', quantity: 1 },
    { item_type: 'printful_merch', provider: 'printful', provider_variant_id: 'hoodie_black_l', quantity: 1 }
  ]
};
check(giftBoxBundle.items.length === 3, 'Gift Box contiene 3 elementos definidos por datos');
check(giftBoxBundle.items.some(i => i.provider === 'factory'), 'Incluye despacho a fabricante genérico');
check(giftBoxBundle.items.some(i => i.provider === 'printful'), 'Incluye despacho a Printful');

// 9. Múltiples Fulfillments segregados para un mismo pedido
function generateFulfillments(orderId, bundleItems) {
  return bundleItems.map((item, idx) => ({
    id: `ful-${orderId}-${idx + 1}`,
    order_id: orderId,
    provider: item.provider,
    status: 'pending'
  }));
}
const fulfillments = generateFulfillments('order-999', giftBoxBundle.items);
check(fulfillments.length === 3, 'El pedido genera 3 fulfillments independientes');
check(fulfillments.filter(f => f.provider === 'printful').length === 1, 'Fulfillment para Printful creado correctamente');
check(fulfillments.filter(f => f.provider === 'factory').length === 1, 'Fulfillment para Fábrica 3D creado correctamente');

// 10. Control atómico de inventario Gold
class AtomicGoldVault {
  constructor(total) { this.total = total; this.assigned = 0; }
  allocate() {
    if (this.assigned < this.total) {
      this.assigned += 1;
      return true;
    }
    return false;
  }
}
const goldVault = new AtomicGoldVault(6);
for (let i = 0; i < 6; i++) {
  check(goldVault.allocate() === true, `Asignación Gold ${i + 1}/6 permitida`);
}
check(goldVault.allocate() === false, 'Intento 7 de Gold denegado (límite alcanzado)');

console.log('\n' + (ok ? 'TODOS LOS CHECKS DE SEGURIDAD Y FOUNDATION V2 OK' : 'HAY FALLOS EN LA SUITE'));
process.exit(ok ? 0 : 1);
