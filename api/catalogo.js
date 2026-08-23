/**
 * Catálogo de packs y validación del carrito.
 * El precio SIEMPRE lo pone el servidor, nunca el navegador.
 * Módulo puro (sin dependencias) para poder testearlo.
 */

export function construirCatalogo(env = process.env) {
  return {
    box1: { price: env.STRIPE_PRICE_BOX1, units: 1,  max: 20 },
    box3: { price: env.STRIPE_PRICE_BOX3, units: 3,  max: 20 },
    box6: { price: env.STRIPE_PRICE_BOX6, units: 6,  max: 20 },
    full: { price: env.STRIPE_PRICE_FULL, units: 15, max: 5 }
  };
}

/**
 * Valida el carrito y devuelve { line_items, cantidad, soloFull }.
 * - Descarta ids desconocidos y packs sin precio configurado.
 * - Limita la cantidad por pack (max) y a 10 líneas como máximo.
 * - `cantidad` = unidades reales (figuras) que luego se sortean.
 * - `soloFull` = true solo si el carrito es únicamente el pack completo
 *   (necesario para garantizar el Gold en la colección completa).
 */
export function construirLineItems(items, catalogo) {
  const lista = Array.isArray(items) ? items.slice(0, 10) : [];
  const line_items = [];
  let cantidad = 0;
  let soloFull = lista.length > 0;

  for (const it of lista) {
    const cat = catalogo[it?.id];
    if (!cat?.price) continue;
    const qty = Math.min(Math.max(parseInt(it.qty, 10) || 1, 1), cat.max);
    line_items.push({ price: cat.price, quantity: qty });
    cantidad += cat.units * qty;
    if (it.id !== 'full') soloFull = false;
  }

  return { line_items, cantidad, soloFull };
}
