import Stripe from 'stripe';
import { claimOnce, logOrder, fetchRetry, notify } from './_lib.js';
import { elegirSinRepes } from './sorteo.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

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
