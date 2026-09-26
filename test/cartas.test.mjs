/**
 * SSCARS GARAGE — Test Suite: Cartas artísticas de los 15 modelos.
 *
 * Comprueba que cada modelo tiene su carta correlativa (arte, OVR y seis
 * estadísticas), que los ficheros existen de verdad en el repo, que el espejo
 * del navegador (`public/js/cartas-data.js`) no se ha desincronizado de la
 * fuente de verdad (`api/cartas.js`) y que la web los usa.
 *
 * Ejecutar:  node test/cartas.test.mjs   (o)   npm test
 */

import fs from 'fs';
import path from 'path';
import { CARTAS, cartaDe, cartaPorNumero } from '../api/cartas.js';
import { MODELOS } from '../api/sorteo.js';

let ok = true;
const check = (cond, msg) => { console.log((cond ? '✅' : '❌') + ' ' + msg); if (!cond) ok = false; };

console.log('--- TEST: CARTAS ARTÍSTICAS DE LOS 15 MODELOS ---');

const CLAVES = ['vel', 'ace', 'man', 'pot', 'est', 'rar'];

// 1. Quince cartas, numeradas 01..15 y sin slugs repetidos
check(CARTAS.length === 15, `Hay ${CARTAS.length} cartas (deben ser 15)`);
check(CARTAS.every((c, i) => c.n === String(i + 1).padStart(2, '0')), 'Numeración correlativa 01..15 en orden');
check(new Set(CARTAS.map(c => c.slug)).size === 15, 'Sin slugs repetidos');

// 2. El arte existe en disco (web + maestro de impresión)
const faltanArte = CARTAS.filter(c => !fs.existsSync(path.resolve('public', c.arte)));
const faltanMaestro = CARTAS.filter(c => !fs.existsSync(path.resolve(c.arteImpresion)));
check(faltanArte.length === 0, `Arte web presente para las 15 cartas${faltanArte.length ? ' (faltan ' + faltanArte.map(c => c.arte).join(', ') + ')' : ''}`);
check(faltanMaestro.length === 0, `Maestro de impresión presente para las 15 cartas${faltanMaestro.length ? ' (faltan ' + faltanMaestro.map(c => c.arteImpresion).join(', ') + ')' : ''}`);

// 3. OVR y estadísticas dentro de rango y con las seis claves
const malRango = CARTAS.filter(c =>
  !(c.ovr >= 1 && c.ovr <= 100) ||
  CLAVES.some(k => !(c.stats[k] >= 1 && c.stats[k] <= 100)));
check(malRango.length === 0, `OVR y estadísticas entre 1 y 100${malRango.length ? ' (revisar ' + malRango.map(c => c.n).join(', ') + ')' : ''}`);
check(CARTAS.every(c => Object.keys(c.stats).sort().join(',') === [...CLAVES].sort().join(',')), 'Cada carta trae las seis estadísticas (vel/ace/man/pot/est/rar)');

// 4. Búsquedas por slug y por número correlativo
check(cartaDe('supra')?.n === '04' && cartaPorNumero(15)?.slug === 'lfa', 'cartaDe(slug) y cartaPorNumero(n) resuelven bien');
check(cartaDe('no-existe') === undefined, 'Slug desconocido devuelve undefined');

// 5. Las cartas y los modelos del sorteo son la misma lista, en el mismo orden
const modelosSorteo = MODELOS.map(m => `${m.n}|${m.slug}|${m.name}`).join(';');
const modelosCartas = CARTAS.map(c => `${c.n}|${c.slug}|${c.name}`).join(';');
check(modelosSorteo === modelosCartas, 'Orden, slug y nombre de carta y modelo coinciden 1:1');
check(MODELOS.every(m => m.ovr && m.stats && m.arte), 'Cada modelo del sorteo arrastra OVR, estadísticas y arte de su carta');
check(MODELOS.reduce((a, m) => a + m.peso, 0) === 100, 'Los pesos del sorteo siguen sumando 100');

// 6. El espejo del navegador está sincronizado con api/cartas.js
const espejoSrc = fs.readFileSync(path.resolve('public/js/cartas-data.js'), 'utf8');
const sandbox = {};
new Function('window', espejoSrc)(sandbox);
const espejo = sandbox.SSCARS_CARTAS;
const aplanar = (lista) => JSON.stringify(lista.map(({ n, slug, name, rareza, ovr, stats, arte, arteImpresion }) =>
  ({ n, slug, name, rareza, ovr, stats, arte, arteImpresion })));
check(Boolean(espejo), 'public/js/cartas-data.js expone window.SSCARS_CARTAS');
check(espejo && aplanar(espejo.lista) === aplanar(CARTAS), 'Espejo web sincronizado con api/cartas.js');
check(espejo && espejo.cartaDe('r34')?.ovr === 93 && espejo.lienzoId('r34', 'carta') === 'lienzo-r34-carta', 'Helpers del espejo (cartaDe / lienzoId) funcionan');

// 7. La web consume las cartas por modelo
const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
const garageHtml = fs.readFileSync(path.resolve('public/garage.html'), 'utf8');
const garageJs = fs.readFileSync(path.resolve('public/js/garage.js'), 'utf8');
const authJs = fs.readFileSync(path.resolve('public/js/auth.js'), 'utf8');
check(indexHtml.includes('js/cartas-data.js'), 'index.html carga js/cartas-data.js');
check(garageHtml.includes('js/cartas-data.js'), 'garage.html carga js/cartas-data.js');
check(indexHtml.includes('id="mcard"') && indexHtml.includes('id="mstats"'), 'La ficha de cada modelo tiene carta (mcard) y estadísticas (mstats)');
check(garageJs.includes('CARTAS.cartaDe(car.slug)'), 'Mi Garaje pinta la carta artística de cada modelo');
check(authJs.includes('image_path') && authJs.includes('ovr'), 'La consulta de la colección pide el arte y el OVR de la carta');

// 8. La migración de Supabase lleva el arte de las 15 cartas y los 45 lienzos
const migracion = fs.readFileSync(path.resolve('supabase/migrations/012_cards_artwork_and_canvas_catalog.sql'), 'utf8');
check(CARTAS.every(c => migracion.includes(c.arte) && migracion.includes(c.arteImpresion)),
  'La migración 012 registra el arte web y el maestro de impresión de las 15 cartas');
check(['delantera', 'trasera', 'carta'].every(a => migracion.includes(`('${a}'`)),
  'La migración 012 define las tres láminas por modelo (delantera, trasera, carta)');
check(migracion.includes('printify') && migracion.includes("'lienzo-' || c.slug || '-' || a.nombre"),
  'Catálogo de lienzos print-on-demand (Printify) generado por modelo × arte: 15 × 3 = 45 productos');

console.log('\n' + (ok ? 'TODOS LOS CHECKS OK' : 'HAY FALLOS'));
process.exit(ok ? 0 : 1);
