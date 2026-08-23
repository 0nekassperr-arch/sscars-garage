// Verificación del catálogo y la validación del carrito (sin red).
import { construirCatalogo, construirLineItems } from '../api/catalogo.js';

const env = {
  STRIPE_PRICE_BOX1: 'price_box1',
  STRIPE_PRICE_BOX3: 'price_box3',
  STRIPE_PRICE_BOX6: 'price_box6',
  STRIPE_PRICE_FULL: 'price_full'
};
const cat = construirCatalogo(env);

let ok = true;
const check = (cond, msg) => { console.log((cond ? '✅' : '❌') + ' ' + msg); if (!cond) ok = false; };

// 1. Carrito normal: 1 pack3 + 2 cajas sueltas -> cantidad 5, no full
let r = construirLineItems([{ id: 'box3', qty: 1 }, { id: 'box1', qty: 2 }], cat);
check(r.line_items.length === 2 && r.cantidad === 5 && r.soloFull === false, `box3 + 2xbox1 -> cantidad ${r.cantidad}, soloFull ${r.soloFull}`);

// 2. Solo pack completo -> soloFull true, cantidad 15
r = construirLineItems([{ id: 'full', qty: 1 }], cat);
check(r.soloFull === true && r.cantidad === 15, `solo full -> soloFull true, cantidad 15`);

// 3. Ids desconocidos se descartan
r = construirLineItems([{ id: 'nope', qty: 5 }], cat);
check(r.line_items.length === 0, `id desconocido -> 0 lineas`);

// 4. Pack sin precio configurado se descarta, el resto queda
const catParcial = construirCatalogo({ STRIPE_PRICE_BOX1: 'p1' });
r = construirLineItems([{ id: 'box3', qty: 1 }, { id: 'box1', qty: 1 }], catParcial);
check(r.line_items.length === 1 && r.line_items[0].price === 'p1', `pack sin precio descartado, box1 queda`);

// 5. Cantidades fuera de rango se limitan al max
r = construirLineItems([{ id: 'box1', qty: 999 }, { id: 'box1', qty: 0 }, { id: 'full', qty: 99 }], cat);
check(r.line_items[0].quantity === 20 && r.line_items[1].quantity === 1 && r.line_items[2].quantity === 5, `qty limitada a max (20/1/5)`);

// 6. Máximo 10 líneas
const quince = Array.from({ length: 15 }, () => ({ id: 'box1', qty: 1 }));
r = construirLineItems(quince, cat);
check(r.line_items.length === 10, `max 10 lineas (${r.line_items.length})`);

// 7. items no-array -> vacío
r = construirLineItems('no-array', cat);
check(r.line_items.length === 0 && r.cantidad === 0, `items no array -> vacio`);

console.log('\n' + (ok ? 'TODOS LOS CHECKS OK' : 'HAY FALLOS'));
process.exit(ok ? 0 : 1);
