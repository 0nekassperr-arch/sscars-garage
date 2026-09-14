/**
 * SSCARS GARAGE 2.0 — Cliente y Adaptador de Supabase
 * Proporciona acceso seguro server-side a Supabase PostgreSQL y Storage.
 * 
 * REGLAS DE SEGURIDAD:
 * - SUPABASE_SERVICE_ROLE_KEY es exclusivamente server-side.
 * - NUNCA se envía al cliente, NUNCA se expone en logs.
 * - Si faltan las variables de entorno, isConfigured() devuelve false
 *   y las funciones retornan null/fallback seguro sin romper la V1.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = () => Boolean(SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY));
export const isServiceRoleReady = () => Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

/**
 * Ejecuta una petición HTTP a la API REST de Supabase (PostgREST)
 */
async function postgrestRequest(path, { method = 'GET', body = null, headers = {}, useServiceRole = true } = {}) {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase no está configurado en las variables de entorno' };
  }

  const apiKey = useServiceRole ? (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY) : (SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY);
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path.replace(/^\//, '')}`;

  const reqHeaders = {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...headers
  };

  try {
    const options = {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : null
    };
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return { ok: false, status: res.status, error: data?.message || data?.error || `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Ejecuta una función almacenada (RPC) en Supabase
 */
export async function rpc(functionName, params = {}, { useServiceRole = true } = {}) {
  return postgrestRequest(`rpc/${functionName}`, {
    method: 'POST',
    body: params,
    useServiceRole
  });
}

/**
 * Obtiene el catálogo de coches activos desde la base de datos
 */
export async function getCarsCatalog() {
  const res = await postgrestRequest('cars?active=eq.true&order=number.asc', { method: 'GET' });
  return res.ok ? res.data : null;
}

/**
 * Obtiene el perfil de un usuario
 */
export async function getUserProfile(userId) {
  if (!userId) return null;
  const res = await postgrestRequest(`profiles?id=eq.${userId}&select=*`, { method: 'GET' });
  return (res.ok && res.data?.length) ? res.data[0] : null;
}

/**
 * Obtiene las cartas de la colección de un usuario
 */
export async function getUserCards(userId) {
  if (!userId) return [];
  const res = await postgrestRequest(`user_cards?user_id=eq.${userId}&select=*,cards(*)`, { method: 'GET' });
  return res.ok ? res.data : [];
}

/**
 * Guarda un snapshot inmutable de build
 */
export async function createBuildSnapshot({ buildId, userId, carId, buildData, stats, renderUrl = null }) {
  if (!userId || !carId || !buildData) {
    return { ok: false, error: 'Faltan parámetros obligatorios para el snapshot' };
  }
  const payload = {
    build_id: buildId || null,
    user_id: userId,
    car_id: carId,
    build_data: buildData,
    stats: stats || {},
    render_url: renderUrl
  };
  return postgrestRequest('build_snapshots', { method: 'POST', body: payload });
}

/**
 * Reclama la recompensa diaria de forma atómica
 */
export async function claimDailyReward({ userId, rewardType = 'xp', rewardData = {} }) {
  if (!userId) return { ok: false, error: 'Usuario requerido' };
  return rpc('claim_daily_reward_atomic', {
    p_user_id: userId,
    p_reward_type: rewardType,
    p_reward_data: rewardData
  });
}

/**
 * Otorga XP de forma atómica e idempotente
 */
export async function awardXp({ userId, amount, reason, referenceType = null, referenceId = null, idempotencyKey = null }) {
  if (!userId || !amount) return { ok: false, error: 'Parámetros de XP inválidos' };
  return rpc('award_xp_atomic', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason || 'general',
    p_ref_type: referenceType,
    p_ref_id: referenceId,
    p_idempotency_key: idempotencyKey
  });
}

/**
 * Asigna una unidad de Gold de forma atómica y protegida contra concurrencia
 */
export async function allocateGoldAtomic(carId) {
  if (!carId) return false;
  const res = await rpc('allocate_gold_atomic', { p_car_id: carId });
  return res.ok ? Boolean(res.data) : false;
}

/**
 * Obtiene las campañas activas
 */
export async function getActiveCampaigns() {
  const now = new Date().toISOString();
  const res = await postgrestRequest(`campaigns?active=eq.true&starts_at=lte.${now}&ends_at=gte.${now}&select=*,products(*)`, { method: 'GET' });
  return res.ok ? res.data : [];
}

/**
 * Obtiene los ítems y composición de un bundle de producto (p. ej. Gift Box)
 */
export async function getProductBundleItems(productId) {
  if (!productId) return [];
  const res = await postgrestRequest(`product_bundle_items?parent_product_id=eq.${productId}&select=*`, { method: 'GET' });
  return res.ok ? res.data : [];
}

/**
 * Registra una orden V2 con sus ítems y líneas de fulfillment segregadas
 */
export async function recordOrderV2({ order, items, fulfillments = [] }) {
  // 1. Insertar orden
  const orderRes = await postgrestRequest('orders', { method: 'POST', body: order });
  if (!orderRes.ok) return orderRes;
  const createdOrder = orderRes.data[0];

  // 2. Insertar order_items con precio histórico congelado
  const itemsWithOrderId = items.map(item => ({ ...item, order_id: createdOrder.id }));
  const itemsRes = await postgrestRequest('order_items', { method: 'POST', body: itemsWithOrderId });
  if (!itemsRes.ok) return itemsRes;

  // 3. Insertar fulfillments si se especificaron
  if (fulfillments.length > 0) {
    const fulfillmentsWithOrderId = fulfillments.map(f => ({ ...f, order_id: createdOrder.id }));
    await postgrestRequest('fulfillments', { method: 'POST', body: fulfillmentsWithOrderId });
  }

  return { ok: true, order: createdOrder, items: itemsRes.data };
}
