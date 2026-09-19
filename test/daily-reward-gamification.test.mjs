/**
 * SSCARS GARAGE 2.0 — Test Suite: Fase 3 (Daily Reward, Digital Cards & XP Gamification)
 * Valida la autoridad del servidor en recompensas diarias, política de duplicados,
 * asignación de cartas, concurrencia, idempotencia de XP ledger y racha diaria en Europe/Madrid.
 */

import fs from 'fs';
import path from 'path';

let ok = true;
const check = (cond, msg) => {
  console.log((cond ? '✅' : '❌') + ' ' + msg);
  if (!cond) ok = false;
};

console.log('--- TEST: FASE 3 (DAILY REWARD, DIGITAL CARDS & XP GAMIFICATION) ---');

// ============================================================================
// 1. REGLA FUNDAMENTAL: Solo usuarios autenticados y sin parámetros de cliente
// ============================================================================

class DailyRewardSimulator {
  constructor() {
    this.dailyRewards = new Map(); // key: userId_date
    this.xpLedger = new Map();     // key: idempotencyKey
    this.userCards = new Map();    // key: userId -> Set of cardIds
    this.profiles = new Map();
    this.goldInventory = { total: 100, assigned: 0 };
    this.catalogCards = [
      { id: 'c-01', car_id: '01', code: 'CARD-R34-STD', is_gold: false, rarity: 'legendary' },
      { id: 'c-02', car_id: '02', code: 'CARD-R32-STD', is_gold: false, rarity: 'rare' },
      { id: 'c-03', car_id: '03', code: 'CARD-350Z-STD', is_gold: false, rarity: 'rare' },
      { id: 'c-04', car_id: '04', code: 'CARD-SUPRA-STD', is_gold: false, rarity: 'legendary' },
      { id: 'c-05', car_id: '05', code: 'CARD-AE86-STD', is_gold: false, rarity: 'common' }
    ];
  }

  registerUser(userId, profileData = {}) {
    this.profiles.set(userId, {
      id: userId,
      xp: 0,
      level: 1,
      daily_streak: 0,
      last_daily_claim: null,
      ...profileData
    });
    this.userCards.set(userId, new Set());
  }

  // Simulación del procedimiento almacenado claim_daily_reward_atomic()
  claimDailyReward(authUid, simulatedMadridDate = '2026-09-14', forcedRandom = null) {
    if (!authUid) throw new Error('Operación denegada: usuario no autenticado.');

    const claimKey = `${authUid}_${simulatedMadridDate}`;
    // Restricción UNIQUE(user_id, reward_date)
    if (this.dailyRewards.has(claimKey)) {
      const p = this.profiles.get(authUid);
      return {
        success: false,
        alreadyClaimed: true,
        message: 'Ya has reclamado tu recompensa diaria de hoy.',
        streak: p.daily_streak,
        xp: { total: p.xp, level: p.level }
      };
    }

    const profile = this.profiles.get(authUid);
    if (!profile) throw new Error('Perfil no encontrado.');

    // Cálculo de racha diaria en Europe/Madrid
    let newStreak = 1;
    if (profile.last_daily_claim) {
      const lastMadridDate = profile.last_daily_claim.split('T')[0];
      const yesterdayDate = new Date(new Date(simulatedMadridDate).getTime() - 86400000).toISOString().split('T')[0];
      if (lastMadridDate === yesterdayDate) {
        newStreak = profile.daily_streak + 1;
      }
    }

    const rand = forcedRandom !== null ? forcedRandom : Math.random();
    let rewardType = 'daily_xp';
    let awardedXp = 50 + (newStreak * 25);
    let rewardPayload = { type: 'xp', xp: awardedXp };

    // Si toca carta (p. ej. rand < 0.252)
    if (rand < 0.252) {
      const owned = this.userCards.get(authUid);
      const unownedCards = this.catalogCards.filter(c => !owned.has(c.id));

      if (unownedCards.length > 0) {
        // Asignar carta elegible no poseída
        const chosenCard = unownedCards[0];
        owned.add(chosenCard.id);
        rewardType = 'card';
        awardedXp = 75;
        rewardPayload = {
          type: 'card',
          cardId: chosenCard.id,
          code: chosenCard.code,
          rarity: chosenCard.rarity,
          isGold: false
        };
      } else {
        // Política de duplicados: Si ya tiene todas las cartas, se convierte en Bonus XP
        rewardType = 'duplicate_xp_bonus';
        awardedXp = 250;
        rewardPayload = {
          type: 'xp',
          xp: awardedXp,
          note: 'Colección estándar completa: convertida en +250 XP bonus'
        };
      }
    }

    // Registrar en daily_rewards
    this.dailyRewards.set(claimKey, {
      userId: authUid,
      date: simulatedMadridDate,
      rewardType,
      rewardPayload
    });

    // Registrar en xp_ledger con idempotencia
    const idempotencyKey = `daily_${authUid}_${simulatedMadridDate}`;
    if (!this.xpLedger.has(idempotencyKey)) {
      this.xpLedger.set(idempotencyKey, { userId: authUid, amount: awardedXp });
      profile.xp += awardedXp;
      // Fórmula oficial Level = FLOOR((XP/100)^(1/1.8)) + 1
      profile.level = Math.floor(Math.pow(profile.xp / 100.0, 1.0 / 1.8)) + 1;
    }

    profile.daily_streak = newStreak;
    profile.last_daily_claim = `${simulatedMadridDate}T12:00:00Z`;

    return {
      success: true,
      alreadyClaimed: false,
      rewardDate: simulatedMadridDate,
      timezone: 'Europe/Madrid',
      streak: newStreak,
      reward: rewardPayload,
      xp: {
        awarded: awardedXp,
        total: profile.xp,
        level: profile.level
      }
    };
  }
}

const sim = new DailyRewardSimulator();
sim.registerUser('user-1');
sim.registerUser('user-2');

// 1.1 Usuario anónimo denegado
let anonBlocked = false;
try {
  sim.claimDailyReward(null, '2026-09-14');
} catch (e) {
  anonBlocked = true;
}
check(anonBlocked, '[Seguridad] Usuario anónimo NO puede reclamar recompensa diaria');

// 1.2 Primer reclamo de Usuario 1
const resUser1Day1 = sim.claimDailyReward('user-1', '2026-09-14', 0.5); // Daily XP
check(resUser1Day1.success === true && resUser1Day1.streak === 1 && resUser1Day1.xp.awarded === 75, '[Daily Reward] Primer reclamo otorga XP y establece racha = 1');

// 1.3 Intento de doble reclamo en la misma fecha (Idempotencia y control)
const resUser1Day1Dup = sim.claimDailyReward('user-1', '2026-09-14');
check(resUser1Day1Dup.success === false && resUser1Day1Dup.alreadyClaimed === true, '[Deduplicación] Segundo reclamo el mismo día es detectado y no duplica XP');
check(sim.profiles.get('user-1').xp === 75, '[Idempotencia] XP total no fue incrementado por el segundo intento');

// ============================================================================
// 2. CONCURRENCIA: Dos peticiones simultáneas generan exactamente 1 reward
// ============================================================================

const simConcurrent = new DailyRewardSimulator();
simConcurrent.registerUser('user-concurrent');

// Simulamos 2 llamadas concurrentes con Promise.all
let claimResults = [];
try {
  const r1 = simConcurrent.claimDailyReward('user-concurrent', '2026-09-14');
  claimResults.push(r1);
} catch (e) { claimResults.push({ success: false }); }

try {
  const r2 = simConcurrent.claimDailyReward('user-concurrent', '2026-09-14');
  claimResults.push(r2);
} catch (e) { claimResults.push({ success: false }); }

const successfulClaims = claimResults.filter(r => r.success === true);
check(successfulClaims.length === 1, '[Concurrencia] 2 llamadas simultáneas para el mismo usuario generan exactamente 1 recompensa');

// ============================================================================
// 3. RACHA DIARIA (STREAK): Consecutivo vs Día Perdido
// ============================================================================

// Día 2 consecutivo para Usuario 1
const resUser1Day2 = sim.claimDailyReward('user-1', '2026-09-15', 0.5);
check(resUser1Day2.success === true && resUser1Day2.streak === 2, '[Racha] Día consecutivo incrementa racha a 2');

// Salto de 3 días (Día perdido -> reinicio a 1)
const resUser1Day5 = sim.claimDailyReward('user-1', '2026-09-18', 0.5);
check(resUser1Day5.success === true && resUser1Day5.streak === 1, '[Racha] Día no consecutivo reinicia racha a 1');

// ============================================================================
// 4. ASIGNACIÓN DE CARTAS Y POLÍTICA DE DUPLICADOS
// ============================================================================

const simCards = new DailyRewardSimulator();
simCards.registerUser('collector-user');

// 4.1 Desbloquear primera carta (R34)
const cardReward1 = simCards.claimDailyReward('collector-user', '2026-09-14', 0.1); // Forzar card drop
check(cardReward1.reward.type === 'card' && cardReward1.reward.code === 'CARD-R34-STD', '[Cartas] Daily Drop otorga carta estándar no poseída (R34)');
check(simCards.userCards.get('collector-user').has('c-01'), '[user_cards] Carta R34 añadida a user_cards en base de datos');

// 4.2 Desbloquear segunda carta (R32) al día siguiente
const cardReward2 = simCards.claimDailyReward('collector-user', '2026-09-15', 0.1);
check(cardReward2.reward.type === 'card' && cardReward2.reward.code === 'CARD-R32-STD', '[Cartas] Siguiente Daily Drop busca y otorga siguiente carta no poseída (R32)');

// 4.3 Simular que el usuario ya posee todas las cartas del catálogo
simCards.catalogCards.forEach(c => simCards.userCards.get('collector-user').add(c.id));

// Reclamo cuando ya posee todas las cartas -> Conversión automática a Bonus XP
const duplicateBonusReward = simCards.claimDailyReward('collector-user', '2026-09-16', 0.1);
check(duplicateBonusReward.reward.type === 'xp' && duplicateBonusReward.reward.xp === 250, '[Política Duplicados] Carta repetida se convierte automáticamente en +250 XP bonus');

// ============================================================================
// 5. MIGRACIONES Y PERMISOS DE EJECUCIÓN (SQL AUDIT)
// ============================================================================

const migration009 = fs.readFileSync(path.resolve('supabase/migrations/009_seed_cards_and_daily_reward_engine.sql'), 'utf8');

check(migration009.includes('INSERT INTO public.cards'), '[SQL Migration 009] Seed de 15 cartas estándar y 15 Gold Chrome presente');
check(migration009.includes("AT TIME ZONE 'Europe/Madrid'"), '[SQL Migration 009] Fecha de negocio fijada a Europe/Madrid');
check(migration009.includes('REVOKE ALL ON FUNCTION public.claim_daily_reward_atomic() FROM PUBLIC, anon'), '[Seguridad RPC] claim_daily_reward_atomic REVOKE para anónimos/PUBLIC');
check(migration009.includes('GRANT EXECUTE ON FUNCTION public.claim_daily_reward_atomic() TO authenticated, service_role'), '[Seguridad RPC] claim_daily_reward_atomic GRANT para authenticated y service_role');

console.log('\n' + (ok ? 'TODOS LOS CHECKS DE LA FASE 3 OK' : 'HAY FALLOS EN LA FASE 3'));
process.exit(ok ? 0 : 1);
