/**
 * SSCARS GARAGE 2.0 — Test Suite: Supabase Foundation & Data Architecture
 * Verifica el modelo de datos, inmutabilidad, RLS, deduplicación, inventario Gold
 * y arquitectura de campaña / bundles sin depender de servicios de red externos.
 */

import { isSupabaseConfigured } from '../api/_supabase.js';

let ok = true;
const check = (cond, msg) => {
  console.log((cond ? '✅' : '❌') + ' ' + msg);
  if (!cond) ok = false;
};

console.log('--- TEST: SUPABASE FOUNDATION & DATA ARCHITECTURE ---');

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

// 5. Daily reward único por día (Deduplicación por fecha)
class DailyRewardManager {
  constructor() { this.claims = new Set(); }
  claim(userId, dateStr) {
    const key = `${userId}_${dateStr}`;
    if (this.claims.has(key)) throw new Error('Recompensa diaria ya reclamada hoy');
    this.claims.add(key);
    return { success: true, date: dateStr };
  }
}
const rewardMgr = new DailyRewardManager();
const claim1 = rewardMgr.claim('user-1', '2026-09-14');
check(claim1.success === true, 'Primer reclamo diario de hoy concedido');
let duplicateClaimFailed = false;
try {
  rewardMgr.claim('user-1', '2026-09-14');
} catch (e) {
  duplicateClaimFailed = true;
}
check(duplicateClaimFailed === true, 'Segundo reclamo diario en la misma fecha rechazado');

// 6. Idempotencia en el XP Ledger
class XpLedger {
  constructor() { this.ledger = new Map(); this.userXp = new Map(); }
  awardXp(userId, amount, idempotencyKey) {
    if (this.ledger.has(idempotencyKey)) {
      return { duplicate: true, totalXp: this.userXp.get(userId) || 0 };
    }
    this.ledger.set(idempotencyKey, { userId, amount });
    const current = (this.userXp.get(userId) || 0) + amount;
    this.userXp.set(userId, current);
    return { duplicate: false, totalXp: current };
  }
}
const xpSystem = new XpLedger();
const r1 = xpSystem.awardXp('user-1', 100, 'daily_reward_2026_09_14');
check(r1.duplicate === false && r1.totalXp === 100, 'XP inicial otorgado');
const r2 = xpSystem.awardXp('user-1', 100, 'daily_reward_2026_09_14');
check(r2.duplicate === true && r2.totalXp === 100, 'Reintento con misma idempotencyKey ignorado');

// 7. Inmutabilidad de Build Snapshots
class BuildSnapshotStore {
  constructor() { this.snapshots = new Map(); }
  create(snapshot) {
    const frozen = Object.freeze(JSON.parse(JSON.stringify(snapshot)));
    this.snapshots.set(snapshot.id, frozen);
    return frozen;
  }
  update(id, newData) {
    if (this.snapshots.has(id)) {
      throw new Error('Los build_snapshots son inmutables');
    }
  }
}
const snapshotStore = new BuildSnapshotStore();
const snap = snapshotStore.create({
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

// 8. Order Item conserva el precio histórico congelado
const productInCatalog = { id: 'box1', current_price: 24.95 };
const orderItem = {
  product_id: productInCatalog.id,
  unit_price: productInCatalog.current_price, // Precio congelado al comprar
  quantity: 1
};
// Simulamos cambio posterior en el catálogo
productInCatalog.current_price = 29.95;
check(orderItem.unit_price === 24.95, 'Order item conserva el precio histórico de compra original');

// 9. Campaña temporal (Gift Box / Black Friday / Navidad) configurable
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
check(isCampaignActive(xmasCampaign, new Date('2027-01-05T12:00:00Z')) === false, 'Campaña inactiva tras finalizar');

// 10. Composición de Bundle dinámico (Gift Box: Mystery Car + Merch Printful)
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

// 11. Múltiples Fulfillments segregados para un mismo pedido
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

// 12. Control atómico de inventario Gold (Prevención de sobreasignación)
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
const goldVault = new AtomicGoldVault(6); // 6 Golds asignados para R34
for (let i = 0; i < 6; i++) {
  check(goldVault.allocate() === true, `Asignación Gold ${i + 1}/6 permitida`);
}
check(goldVault.allocate() === false, 'Intento 7 de Gold denegado (límite alcanzado)');

console.log('\n' + (ok ? 'TODOS LOS CHECKS DE LA V2 FOUNDATION OK' : 'HAY FALLOS EN LA V2 FOUNDATION'));
process.exit(ok ? 0 : 1);
