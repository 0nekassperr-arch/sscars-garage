import Stripe from 'stripe';
import { construirCatalogo, construirLineItems } from './catalogo.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const PAISES = ['ES','PT','FR','IT','DE','NL','BE','AT','IE','LU','SE','DK','FI','PL','CZ'];

/**
 * CORS: permite que la vista previa de GitHub Pages (*.github.io) llame a esta API
 * para cobrar (el frontend usa API_BASE = 'https://sscarsgarage.vercel.app' allí).
 * El checkout es un POST público sin credenciales/cookies, así que `*` es seguro.
 */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Pago no configurado' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { line_items, cantidad, soloFull } = construirLineItems(body.items, construirCatalogo());

    if (!line_items.length) {
      return res.status(400).json({ error: 'Carrito vacío o precios no configurados en el servidor' });
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      locale: 'es',
      billing_address_collection: 'auto',
      shipping_address_collection: { allowed_countries: PAISES },
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      metadata: { cantidad: String(cantidad), packFull: soloFull ? '1' : '0' },
      success_url: `${origin}/?pago=ok&sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?pago=cancelado#packs`
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('checkout error', e);
    return res.status(500).json({ error: 'No se pudo crear la sesión de pago' });
  }
}
