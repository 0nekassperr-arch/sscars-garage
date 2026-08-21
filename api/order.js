import Stripe from 'stripe';
import { claimOnce, logOrder, fetchRetry, notify } from './_lib.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

/** Los 15 modelos. fileFinal = STL que se manda a fabricar. */
export const MODELOS = [
  { n: '01', name: 'El Emperador Azul',        slug: 'r34',     peso: 2.5 },
  { n: '02', name: 'El Monstruo Purpura',      slug: 'r32',     peso: 7   },
  { n: '03', name: 'Colmillo Azul',            slug: '350z',    peso: 7   },
  { n: '04', name: 'La Bestia Naranja',        slug: 'supra',   peso: 2.5 },
  { n: '05', name: 'El Fantasma de la Montana',slug: 'ae86',    peso: 9   },
  { n: '06', name: 'El Exotico de Bolsillo',   slug: 'mr2',     peso: 9   },
  { n: '07', name: 'El Aullido Rotativo',      slug: 'rx7',     peso: 5   },
  { n: '08', name: 'El Samurai Rojo',          slug: 'nsx',     peso: 5   },
  { n: '09', name: 'El Puno Blanco',           slug: 'civic',   peso: 9   },
  { n: '10', name: 'El Grito Amarillo',        slug: 's2000',   peso: 7   },
  { n: '11', name: 'El Domador',               slug: 'evo',     peso: 7   },
  { n: '12', name: 'Verde Veneno',             slug: 'eclipse', peso: 9   },
  { n: '13', name: 'El Visionario',            slug: '3000gt',  peso: 9   },
  { n: '14', name: 'El Azul del Rally',        slug: 'wrc',     peso: 7   },
  { n: '15', name: 'La Voz del V10',           slug: 'lfa',     peso: 5   }
];

const GOLD_PROB = 0.002; // 1/500 por caja

/**
 * Sorteo de la caja sorpresa.
 * - Muestreo PONDERADO sin reemplazo: respeta los porcentajes publicados en la web
 *   (2,5% legendario / 5% epico / 7% raro / 9% clasico), que suman 100.
 * - Cero repetidos dentro del mismo pedido.
 * - Si el pedido supera los 15 modelos, se abre una ronda nueva.
 * - Gold Chrome: tirada independiente por caja, 1/500. NO garantizado en ningun pack.
 */
export function elegirSinRepes(cantidad, { packFull = false } = {}) {
  const total = Math.min(Math.max(parseInt(cantidad, 10) || 1, 1), 60);

  const sacarUno = (pool) => {
    const suma = pool.reduce((a, m) => a + m.peso, 0);
    let r = Math.random() * suma;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].peso;
      if (r <= 0) return pool.splice(i, 1)[0];
    }
    return pool.pop();
  };

  let pool = [...MODELOS];
  const out = [];
  while (out.length < total) {
    if (!pool.length) pool = [...MODELOS];
    out.push(sacarUno(pool));
  }

  const conGold = out.map(m => ({ ...m, esGold: Math.random() < GOLD_PROB }));

  // El pack de coleccion completa garantiza AL MENOS un Gold Chrome.
  // Si el azar no ha dado ninguno, se fuerza uno al azar entre las figuras del pedido.
  if (packFull && !conGold.some(f => f.esGold)) {
    conGold[Math.floor(Math.random() * conGold.length)].esGold = true;
  }
  return conGold;
}

const MODEL_EXT = process.env.MODEL_EXT || 'stl';
const stlUrl = (slug, gold) => `${process.env.STL_BASE_URL}/${slug}${gold ? '-gold' : ''}.${MODEL_EXT}`;

async function pedirAFabrica(figura, direccion, orderId) {
  if (!process.env.JLC_API_KEY || !process.env.STL_BASE_URL) {
    return { ok: false, motivo: 'API de fabricación no configurada (modo manual)' };
  }
  try {
    await fetchRetry('https://api.jlc3dp.com/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Api-Key': process.env.JLC_API_KEY },
      body: JSON.stringify({
        files: [{ url: stlUrl(figura.slug, figura.esGold) }],
        shipping_address: direccion,
        shipping_method: 'DHL',
        packaging: 'plain_box_no_logo',
        material: 'X Resin',
        notes: `SSCARS ${figura.n} ${figura.name}${figura.esGold ? ' GOLD' : ''} · ${orderId}`
      })
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: e.message };
  }
}

async function rawBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      await rawBody(req),
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  if (event.type !== 'checkout.session.completed') return res.json({ received: true });

  const s = event.data.object;

  // Idempotencia: Stripe reintenta. Sin esto, un cliente recibiría el pedido dos veces.
  if (!(await claimOnce(`sscars:done:${s.id}`))) {
    console.log('duplicado ignorado', s.id);
    return res.json({ received: true, duplicated: true });
  }

  const cantidad = parseInt(s.metadata?.cantidad || '1', 10);
  const packFull = s.metadata?.packFull === '1';
  const c = s.customer_details || {};
  const a = c.address || {};

  const direccion = {
    name: c.name || '',
    email: c.email || '',
    phone: c.phone || '',
    street: a.line1 || '',
    street2: a.line2 || '',
    city: a.city || '',
    state: a.state || '',
    zip: a.postal_code || '',
    country: a.country || ''
  };

  const figuras = elegirSinRepes(cantidad, { packFull });
  const resultados = [];
  for (const f of figuras) resultados.push({ ...f, envio: await pedirAFabrica(f, direccion, s.id) });

  const fallos = resultados.filter(r => !r.envio.ok);
  const order = {
    id: s.id,
    fecha: new Date().toISOString(),
    email: direccion.email,
    total: (s.amount_total || 0) / 100,
    cantidad,
    direccion,
    figuras: resultados.map(r => ({ n: r.n, name: r.name, slug: r.slug, esGold: r.esGold, ok: r.envio.ok })),
    pendientes: fallos.length
  };
  await logOrder(order);

  const lista = resultados.map(r => `${r.n} ${r.name}${r.esGold ? ' 🥇 GOLD' : ''} — ${r.envio.ok ? 'enviado a fábrica' : '⚠️ ' + r.envio.motivo}`).join('<br>');
  await notify(
    `${fallos.length ? '⚠️ ' : '✅ '}Pedido SSCARS ${order.total.toFixed(2)}€ · ${cantidad} figura(s)`,
    `<h2>Pedido ${s.id}</h2><p><b>${direccion.name}</b> · ${direccion.email}<br>
     ${direccion.street} ${direccion.street2}, ${direccion.zip} ${direccion.city} (${direccion.country})</p>
     <p>${lista}</p>${fallos.length ? '<p><b>Hay figuras sin enviar a fábrica: súbelas a mano.</b></p>' : ''}`
  );

  console.log('pedido', s.id, order.figuras.map(f => f.n + (f.esGold ? 'G' : '')).join(','));
  res.json({ received: true });
}

export const config = { api: { bodyParser: false } };
