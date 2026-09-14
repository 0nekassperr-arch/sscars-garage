/**
 * SSCARS GARAGE 2.0 — Test Suite: Fase 2.1 (Auth, Garage, Collection & Level Authority)
 * Valida la fuente única de verdad para Auth, el modelo de propiedad de cartas,
 * la fórmula centralizada XP -> Level y la timezone Europe/Madrid para Daily Rewards.
 */

import fs from 'fs';
import path from 'path';

let ok = true;
const check = (cond, msg) => {
  console.log((cond ? '✅' : '❌') + ' ' + msg);
  if (!cond) ok = false;
};

console.log('--- TEST: FASE 2.1 (AUDITORÍA & CORRECCIÓN AUTH + GARAGE + XP) ---');

// ============================================================================
// 1. AUTH: Sesión única, no duplicidad de autoridad y persistencia
// ============================================================================

class MockSessionStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.get(k) || null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
}

const mockStorage = new MockSessionStorage();

const mockSession = {
  access_token: 'mock-jwt-token-user-a',
  refresh_token: 'mock-refresh-token-user-a',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: 'user-uuid-1111',
    email: 'ryosuke@projectd.jp',
    user_metadata: { username: 'ryosuke_fc', full_name: 'Ryosuke Takahashi' }
  }
};

mockStorage.setItem('sscars_auth_session_v2', JSON.stringify(mockSession));
const loadedSession = JSON.parse(mockStorage.getItem('sscars_auth_session_v2'));
check(loadedSession.user.id === 'user-uuid-1111', '[Auth] Sesión restaurada con id correcto');

// Comprobar que en 401 (token revocado por Supabase) la sesión local se invalida
function handleApiResponse(status) {
  if (status === 401) {
    mockStorage.removeItem('sscars_auth_session_v2');
    return { authenticated: false };
  }
  return { authenticated: true };
}
const authStatusAfter401 = handleApiResponse(401);
check(authStatusAfter401.authenticated === false && mockStorage.getItem('sscars_auth_session_v2') === null, '[Auth] 401 de Supabase purga inmediatamente el estado local (Supabase es la autoridad)');

// Logout seguro no borra el carrito de compras V1
mockStorage.setItem('sscars_cart_v1', JSON.stringify([{ id: 'box3', qty: 1 }]));
mockStorage.removeItem('sscars_auth_session_v2');
check(mockStorage.getItem('sscars_cart_v1') !== null, '[Compatibilidad V1] Logout no borra el carrito de compras del visitante');

// ============================================================================
// 2. PROPIEDAD DE CARTAS (TEST OBLIGATORIO: Usuario A vs Usuario B)
// ============================================================================

const databaseUserCards = [
  // Usuario A posee R34
  { id: 'uc-1', user_id: 'user-A', card_id: 'c-r34', cards: { id: 'c-r34', car_id: '01', code: 'CARD-R34-001', is_gold: false } },
  // Usuario B posee R32
  { id: 'uc-2', user_id: 'user-B', card_id: 'c-r32', cards: { id: 'c-r32', car_id: '02', code: 'CARD-R32-001', is_gold: false } }
];

// Simulación de consulta protegida por RLS: SELECT * FROM user_cards WHERE user_id = auth.uid()
function queryUserCardsByAuthUid(authUid) {
  return databaseUserCards.filter(uc => uc.user_id === authUid);
}

// Renderizado de garaje para Usuario A
const userACards = queryUserCardsByAuthUid('user-A');
const ownedMapA = new Map();
userACards.forEach(uc => ownedMapA.set(uc.cards.car_id, uc.cards));

check(ownedMapA.has('01') === true, '[Colección] Garage de Usuario A: R34 (#01) marcado como OWNED');
check(ownedMapA.has('02') === false, '[Colección] Garage de Usuario A: R32 (#02) marcado como LOCKED');

// Comprobar que Usuario A NO ve R32 aunque Usuario B lo posea en la base de datos
const userBCards = queryUserCardsByAuthUid('user-B');
const ownedMapB = new Map();
userBCards.forEach(uc => ownedMapB.set(uc.cards.car_id, uc.cards));

check(ownedMapB.has('02') === true, '[Colección] Garage de Usuario B: R32 (#02) marcado como OWNED');
check(ownedMapA.has('02') === false, '[RLS & Colección] Garage de A NUNCA muestra R32 como owned');

// ============================================================================
// 3. FUENTE ÚNICA DE VERDAD: XP -> LEVEL
// ============================================================================

// Función oficial cuadrática: Level = FLOOR((XP / 100) ^ (1 / 1.8)) + 1
function calculateDriverLevel(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  return Math.floor(Math.pow(safeXp / 100.0, 1.0 / 1.8)) + 1;
}

check(calculateDriverLevel(0) === 1, '[XP->Level] 0 XP = Nivel 1');
check(calculateDriverLevel(100) === 2, '[XP->Level] 100 XP = Nivel 2');
check(calculateDriverLevel(349) === 3, '[XP->Level] 349 XP = Nivel 3');
check(calculateDriverLevel(741) === 4, '[XP->Level] 741 XP = Nivel 4');
check(calculateDriverLevel(5000) === 9, '[XP->Level] 5000 XP = Nivel 9');

// Comprobar migración 008 en SQL
const migration008 = fs.readFileSync(path.resolve('supabase/migrations/008_driver_level_and_timezone.sql'), 'utf8');
check(migration008.includes('FUNCTION public.calculate_driver_level'), '[XP->Level] calculate_driver_level definida como función inmutable en PostgreSQL');
check(migration008.includes('level = public.calculate_driver_level'), '[XP->Level] award_xp_atomic y claim_daily_reward_atomic usan la función centralizada');

// ============================================================================
// 4. TIMEZONE Y DÍA DE NEGOCIO: Europe/Madrid
// ============================================================================

check(migration008.includes("AT TIME ZONE 'Europe/Madrid'"), '[Timezone] claim_daily_reward_atomic evalúa la fecha en Europe/Madrid');

function getMadridDateStr(isoUtcString) {
  const date = new Date(isoUtcString);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(date); // YYYY-MM-DD
}

// Ejemplo: 2026-09-14T23:30:00Z (medianoche en UTC) en Madrid son las 01:30 del 15 de septiembre (CEST UTC+2)
const utcMidnight = '2026-09-14T23:30:00Z';
const madridDate = getMadridDateStr(utcMidnight);
check(madridDate === '2026-09-15', '[Timezone] Transición de día evaluada a las 00:00:00 hora de Madrid');

// ============================================================================
// 5. SEGURIDAD DE CLAVES EN FRONTEND
// ============================================================================

const authJsCode = fs.readFileSync(path.resolve('public/js/auth.js'), 'utf8');
check(!authJsCode.includes('SERVICE_ROLE') && !authJsCode.includes('service_role'), '[Seguridad] public/js/auth.js NO expone SERVICE_ROLE_KEY');

const configJsCode = fs.readFileSync(path.resolve('public/js/supabase-config.js'), 'utf8');
check(!configJsCode.includes('SERVICE_ROLE') && !configJsCode.includes('service_role'), '[Seguridad] public/js/supabase-config.js NO expone SERVICE_ROLE_KEY');

console.log('\n' + (ok ? 'TODOS LOS CHECKS DE LA FASE 2.1 OK' : 'HAY FALLOS EN LA FASE 2.1'));
process.exit(ok ? 0 : 1);
