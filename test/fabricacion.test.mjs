// Verificación del despacho de fabricación genérico (solo ramas sin red).
import { pedirAFabrica } from '../api/fabricacion.js';

const figura = { n: '01', name: 'El Emperador Azul', slug: 'r34', esGold: false };
const dir = { name: 'Test', email: 't@t.es', country: 'ES' };

let ok = true;
const check = (cond, msg) => { console.log((cond ? '✅' : '❌') + ' ' + msg); if (!cond) ok = false; };

// 1. FABRICANTE desconocido -> error claro
process.env.FABRICANTE = 'no-existe';
const r1 = await pedirAFabrica(figura, dir, 'order-1');
check(r1.ok === false && /desconocido/.test(r1.motivo), `FABRICANTE desconocido -> motivo claro ("${r1.motivo}")`);

// 2. factory sin claves -> modo manual
delete process.env.FABRICANTE;
delete process.env.FACTORY_API_KEY;
delete process.env.STL_BASE_URL;
const r2 = await pedirAFabrica(figura, dir, 'order-2');
check(r2.ok === false && /no configurada/.test(r2.motivo), `factory sin claves -> modo manual ("${r2.motivo}")`);

// 3. factory con solo una clave -> sigue en manual y lista lo que falta
process.env.FACTORY_API_KEY = 'fake';
const r3 = await pedirAFabrica(figura, dir, 'order-3');
check(r3.ok === false && r3.motivo.includes('STL_BASE_URL'), `factory con clave parcial -> indica STL_BASE_URL ("${r3.motivo}")`);

console.log('\n' + (ok ? 'TODOS LOS CHECKS OK' : 'HAY FALLOS'));
process.exit(ok ? 0 : 1);
