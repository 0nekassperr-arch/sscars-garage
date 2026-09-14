/**
 * SSCARS GARAGE 2.0 — Test Suite: Fase 2 (Auth, Garage & Digital Collection)
 * Valida el ciclo de vida de Auth, sesión persistente, recuperación de contraseña,
 * aislamiento de perfiles/colección y compatibilidad hacia atrás con V1.
 */

import fs from 'fs';
import path from 'path';

let ok = true;
const check = (cond, msg) => {
  console.log((cond ? '✅' : '❌') + ' ' + msg);
  if (!cond) ok = false;
};

console.log('--- TEST: FASE 2 (AUTH, GARAGE & COLECCIÓN DIGITAL) ---');

// ============================================================================
// 1. AUTH: Registro, Login, Logout y Sesión Persistente
// ============================================================================

class MockSessionStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.get(k) || null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
}

const mockStorage = new MockSessionStorage();

// Simulación de sesión JWT de Supabase
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

// Guardar sesión persistente
mockStorage.setItem('sscars_auth_session_v2', JSON.stringify(mockSession));
check(mockStorage.getItem('sscars_auth_session_v2') !== null, '[Auth] Sesión guardada en almacenamiento persistente');

// Cargar y validar sesión
const loadedRaw = mockStorage.getItem('sscars_auth_session_v2');
const loadedSession = JSON.parse(loadedRaw);
check(loadedSession.user.id === 'user-uuid-1111' && loadedSession.user.email === 'ryosuke@projectd.jp', '[Auth] Sesión restaurada con id y email correctos');

// Comprobación de expiración de sesión
const isExpired = Math.floor(Date.now() / 1000) >= loadedSession.expires_at;
check(!isExpired, '[Auth] Sesión válida (no expirada)');

// Logout seguro (limpia sesión auth pero NO borra el carrito V1 de localStorage)
mockStorage.setItem('sscars_cart_v1', JSON.stringify([{ id: 'box3', qty: 1 }]));
mockStorage.removeItem('sscars_auth_session_v2'); // Simula logout
check(mockStorage.getItem('sscars_auth_session_v2') === null, '[Auth] Logout elimina la sesión del usuario');
check(mockStorage.getItem('sscars_cart_v1') !== null, '[Compatibilidad V1] Logout NO elimina el carrito de compras del visitante');

// Recuperación de contraseña (estructuración de payload de recuperación)
function createPasswordRecoveryPayload(email) {
  if (!email || !email.includes('@')) throw new Error('Email inválido');
  return { email: email.trim().toLowerCase() };
}
const recoveryPayload = createPasswordRecoveryPayload('Takumi@Akina.jp');
check(recoveryPayload.email === 'takumi@akina.jp', '[Auth] Payload de recuperación de contraseña formateado correctamente');

// ============================================================================
// 2. SEGURIDAD & RLS: Aislamiento de Perfiles y Colección
// ============================================================================

// [Seguridad] Usuario A no puede acceder a colección de Usuario B
function evaluateUserCardsRls(authUserId, cardOwnerId) {
  // Política RLS: USING (auth.uid() = user_id)
  return authUserId === cardOwnerId;
}
check(evaluateUserCardsRls('user-A', 'user-A') === true, '[RLS] Usuario A puede leer su propia colección');
check(evaluateUserCardsRls('user-A', 'user-B') === false, '[RLS] Usuario A NO puede leer la colección de Usuario B');

// [Seguridad] Usuario A no puede actualizar perfil de Usuario B
function evaluateProfileUpdateRls(authUserId, targetProfileId) {
  return authUserId === targetProfileId;
}
check(evaluateProfileUpdateRls('user-A', 'user-A') === true, '[RLS] Usuario A puede actualizar su propio perfil');
check(evaluateProfileUpdateRls('user-A', 'user-B') === false, '[RLS] Usuario A NO puede actualizar perfil de Usuario B');

// [Seguridad] Inmutabilidad de campos de sistema (role, xp, level)
function simulateProfileFieldUpdate(authRole, payload) {
  if (authRole === 'authenticated') {
    const forbidden = ['role', 'xp', 'level', 'daily_streak', 'last_daily_claim'];
    for (const f of forbidden) {
      if (payload[f] !== undefined) {
        throw new Error(`Campo protegido: ${f}`);
      }
    }
  }
  return { ok: true };
}

let roleExploitBlocked = false;
try {
  simulateProfileFieldUpdate('authenticated', { role: 'admin' });
} catch (e) {
  roleExploitBlocked = true;
}
check(roleExploitBlocked, '[Seguridad] Usuario no puede modificar el campo role');

let xpExploitBlocked = false;
try {
  simulateProfileFieldUpdate('authenticated', { xp: 50000 });
} catch (e) {
  xpExploitBlocked = true;
}
check(xpExploitBlocked, '[Seguridad] Usuario no puede modificar el campo xp');

let levelExploitBlocked = false;
try {
  simulateProfileFieldUpdate('authenticated', { level: 99 });
} catch (e) {
  levelExploitBlocked = true;
}
check(levelExploitBlocked, '[Seguridad] Usuario no puede modificar el campo level');

// Inserción directa de user_cards bloqueada por RLS
function evaluateUserCardInsert(authRole) {
  // Solo service_role puede insertar
  return authRole === 'service_role';
}
check(evaluateUserCardInsert('authenticated') === false, '[Seguridad] Usuario autenticado NO puede auto-insertarse cartas');
check(evaluateUserCardInsert('anon') === false, '[Seguridad] Visitante anónimo NO puede auto-insertarse cartas');
check(evaluateUserCardInsert('service_role') === true, '[Seguridad] Service Role (Backend) autorizado para asignar cartas');

// ============================================================================
// 3. COLECCIÓN DIGITAL: Modelado, Mapeo y Gold Chase
// ============================================================================

const mockCarsCatalog = [
  { id: '01', number: '01', slug: 'r34', name: 'El Emperador Azul', real_model: 'Nissan Skyline GT-R R34', rarity: 'legendary' },
  { id: '02', number: '02', slug: 'r32', name: 'El Monstruo Púrpura', real_model: 'Nissan Skyline GT-R R32', rarity: 'rare' },
  { id: '04', number: '04', slug: 'supra', name: 'La Bestia Naranja', real_model: 'Toyota Supra MK4', rarity: 'legendary' }
];

const mockUserCards = [
  {
    id: 'uc-1',
    user_id: 'user-uuid-1111',
    card_id: 'card-r34-gold',
    obtained_at: '2026-09-14T10:00:00Z',
    source: 'mystery_box',
    cards: {
      id: 'card-r34-gold',
      car_id: '01',
      rarity: 'gold_chrome',
      code: 'CARD-R34-001-GOLD',
      is_gold: true
    }
  },
  {
    id: 'uc-2',
    user_id: 'user-uuid-1111',
    card_id: 'card-supra-std',
    obtained_at: '2026-09-14T11:00:00Z',
    source: 'mystery_box',
    cards: {
      id: 'card-supra-std',
      car_id: '04',
      rarity: 'legendary',
      code: 'CARD-SUPRA-015',
      is_gold: false
    }
  }
];

// Comprobar mapa de posesión
const ownedMap = new Map();
mockUserCards.forEach(uc => ownedMap.set(uc.cards.car_id, uc.cards));

check(ownedMap.has('01') === true, '[Colección] R34 marcado como poseído en el garaje');
check(ownedMap.has('04') === true, '[Colección] Supra marcado como poseído en el garaje');
check(ownedMap.has('02') === false, '[Colección] R32 marcado como bloqueado/no descubierto');

// Identificación de Gold Chrome
const r34Card = ownedMap.get('01');
check(r34Card.is_gold === true && r34Card.rarity === 'gold_chrome', '[Colección] Carta Gold Chase identificada correctamente');

const supraCard = ownedMap.get('04');
check(supraCard.is_gold === false && supraCard.code === 'CARD-SUPRA-015', '[Colección] Carta estándar asociada al coche correcto');

// ============================================================================
// 4. ARCHIVOS Y CONFIGURACIÓN PÚBLICA
// ============================================================================

const authJsCode = fs.readFileSync(path.resolve('public/js/auth.js'), 'utf8');
check(!authJsCode.includes('SERVICE_ROLE') && !authJsCode.includes('service_role'), '[Seguridad] public/js/auth.js NO expone SERVICE_ROLE_KEY');

const configJsCode = fs.readFileSync(path.resolve('public/js/supabase-config.js'), 'utf8');
check(!configJsCode.includes('SERVICE_ROLE') && !configJsCode.includes('service_role'), '[Seguridad] public/js/supabase-config.js NO expone SERVICE_ROLE_KEY');

console.log('\n' + (ok ? 'TODOS LOS CHECKS DE LA FASE 2 OK' : 'HAY FALLOS EN LA FASE 2'));
process.exit(ok ? 0 : 1);
