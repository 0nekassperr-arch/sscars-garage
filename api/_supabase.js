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
export async function rpc(functionName, params = {}, { useServiceRole = true, headers = {} } = {}) {
  return postgrestRequest(`rpc/${functionName}`, {
    method: 'POST',
    body: params,
    useServiceRole,
    headers
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
 * Obtiene las piezas de tuning activas
 */
export async function getTuningPartsCatalog() {
  const res = await postgrestRequest('tuning_parts?active=eq.true&order=category.asc,xp_required.asc', { method: 'GET' });
  return res.ok ? res.data : [];
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
 * Obtiene los builds de un usuario
 */
export async function getUserBuilds(userId, userToken = null) {
  if (!userId) return [];
  const headers = userToken ? { Authorization: `Bearer ${userToken}` } : {};
  const res = await postgrestRequest(`builds?user_id=eq.${userId}&select=*&order=created_at.desc`, {
    method: 'GET',
    useServiceRole: !userToken,
    headers
  });
  return res.ok ? res.data : [];
}

/**
 * Guarda o actualiza un build de forma atómica validando ownership y XP en servidor
 */
export async function saveBuildAtomic({ carId, name, partSlugs = [], buildId = null, userToken = null }) {
  const headers = userToken ? { Authorization: `Bearer ${userToken}` } : {};
  return rpc('save_build_atomic', {
    p_car_id: carId,
    p_name: name,
    p_part_slugs: partSlugs,
    p_build_id: buildId
  }, { useServiceRole: !userToken, headers });
}

/**
 * Crea un snapshot inmutable a partir de un build
 */
export async function createBuildSnapshotAtomic({ buildId, userToken = null }) {
  const headers = userToken ? { Authorization: `Bearer ${userToken}` } : {};
  return rpc('create_build_snapshot_atomic', { p_build_id: buildId }, { useServiceRole: !userToken, headers });
}

/**
 * Solicita o recupera un render determinista de un snapshot inmutable
 */
export async function requestBuildRenderAtomic({ snapshotId, provider = 'mock', version = '1.0.0', userToken = null }) {
  const headers = userToken ? { Authorization: `Bearer ${userToken}` } : {};
  return rpc('request_build_render_atomic', {
    p_snapshot_id: snapshotId,
    p_provider: provider,
    p_version: version
  }, { useServiceRole: !userToken, headers });
}

/**
 * Obtiene los snapshots inmutables del usuario
 */
export async function getUserSnapshots(userId, userToken = null) {
  if (!userId) return [];
  const headers = userToken ? { Authorization: `Bearer ${userToken}` } : {};
  const res = await postgrestRequest(`build_snapshots?user_id=eq.${userId}&select=*&order=created_at.desc`, {
    method: 'GET',
    useServiceRole: !userToken,
    headers
  });
  return res.ok ? res.data : [];
}

/**
 * Elimina un build propio
 */
export async function deleteBuildAtomic({ buildId, userToken = null }) {
  const headers = userToken ? { Authorization: `Bearer ${userToken}` } : {};
  return rpc('delete_build_atomic', { p_build_id: buildId }, { useServiceRole: !userToken, headers });
}

/**
 * Reclama la recompensa diaria de forma atómica (identidad validada server-side)
 */
export async function claimDailyReward({ userToken = null } = {}) {
  const headers = userToken ? { Authorization: `Bearer ${userToken}` } : {};
  return rpc('claim_daily_reward_atomic', {}, { useServiceRole: !userToken, headers });
}

/**
 * Otorga XP de forma atómica e idempotente (Solo ejecutable por service_role)
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
  }, { useServiceRole: true });
}

/**
 * Asigna una unidad de Gold de forma atómica y protegida contra concurrencia (Solo ejecutable por service_role)
 */
export async function allocateGoldAtomic(carId) {
  if (!carId) return false;
  const res = await rpc('allocate_gold_atomic', { p_car_id: carId }, { useServiceRole: true });
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
  const orderRes = await postgrestRequest('orders', { method: 'POST', body: order });
  if (!orderRes.ok) return orderRes;
  const createdOrder = orderRes.data[0];

  const itemsWithOrderId = items.map(item => ({ ...item, order_id: createdOrder.id }));
  const itemsRes = await postgrestRequest('order_items', { method: 'POST', body: itemsWithOrderId });
  if (!itemsRes.ok) return itemsRes;

  if (fulfillments.length > 0) {
    const fulfillmentsWithOrderId = fulfillments.map(f => ({ ...f, order_id: createdOrder.id }));
    await postgrestRequest('fulfillments', { method: 'POST', body: fulfillmentsWithOrderId });
  }

  return { ok: true, order: createdOrder, items: itemsRes.data };
}
