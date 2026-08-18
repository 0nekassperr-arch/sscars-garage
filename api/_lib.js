/**
 * SSCARS · almacenamiento y utilidades compartidas.
 * Usa Upstash Redis (REST, plan gratuito) si está configurado.
 * Si no lo está, cae a memoria: funciona, pero la idempotencia
 * sólo dura lo que viva la instancia serverless.
 */
const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
export const kvReady = Boolean(URL_ && TOKEN);

const mem = new Map();

async function cmd(...args) {
  const r = await fetch(`${URL_}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!r.ok) throw new Error(`upstash ${r.status}`);
  return (await r.json()).result;
}

/** Devuelve true sólo la primera vez que se ve esa clave (anti-duplicados de webhook). */
export async function claimOnce(key, ttlSeconds = 60 * 60 * 24 * 30) {
  if (!kvReady) {
    if (mem.has(key)) return false;
    mem.set(key, 1);
    return true;
  }
  const res = await cmd('set', key, '1', 'nx', 'ex', String(ttlSeconds));
  return res === 'OK';
}

/** Guarda el pedido para el panel /api/admin y para auditoría. */
export async function logOrder(order) {
  if (!kvReady) { mem.set('order:' + order.id, order); return; }
  await cmd('lpush', 'sscars:orders', JSON.stringify(order));
  await cmd('ltrim', 'sscars:orders', '0', '999');
  if (order.figuras.some(f => f.esGold)) await cmd('incr', 'sscars:golds');
}

export async function readOrders(limit = 100) {
  if (!kvReady) return [...mem.values()].filter(v => typeof v === 'object');
  const rows = await cmd('lrange', 'sscars:orders', '0', String(limit - 1));
  return (rows || []).map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
}

/** fetch con timeout y reintentos con backoff. */
export async function fetchRetry(url, options = {}, { retries = 3, timeout = 15000 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(url, { ...options, signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok) return r;
      if (r.status < 500 && r.status !== 429) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
      lastErr = new Error(`HTTP ${r.status}`);
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
    }
    if (i < retries) await new Promise(r => setTimeout(r, 500 * 2 ** i));
  }
  throw lastErr;
}

/** Aviso por email (Resend). Silencioso si no está configurado. */
export async function notify(subject, html) {
  if (!process.env.RESEND_API_KEY || !process.env.ALERT_EMAIL) return;
  try {
    await fetchRetry('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'SSCARS <onboarding@resend.dev>',
        to: [process.env.ALERT_EMAIL],
        subject,
        html
      })
    }, { retries: 1 });
  } catch (e) { console.error('notify error', e.message); }
}
