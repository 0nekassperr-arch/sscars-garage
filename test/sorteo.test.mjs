// Verificación del sorteo de la caja sorpresa (sin dependencias externas).
// Ejecutar:  npm test   (o)   node test/sorteo.test.mjs
import { MODELOS, GOLD_PROB, elegirSinRepes } from '../api/sorteo.js';

let ok = true;
const check = (cond, msg) => {
  console.log((cond ? '✅' : '❌') + ' ' + msg);
  if (!cond) ok = false;
};

// 1. Los pesos suman 100 (coinciden con los porcentajes publicados)
const suma = MODELOS.reduce((a, m) => a + m.peso, 0);
check(suma === 100, `Pesos suman ${suma} (debe ser 100)`);

// 2. Cero repetidos dentro de packs de 1..15 (100.000 packs)
let repetidos = 0;
for (let i = 0; i < 100000; i++) {
  const n = 1 + Math.floor(Math.random() * 15);
  const slugs = elegirSinRepes(n).map(f => f.slug);
  if (new Set(slugs).size !== slugs.length) repetidos++;
}
check(repetidos === 0, `Sin repetidos en packs 1-15 (100.000 packs, ${repetidos} fallos)`);

// 3. El pack completo (15) garantiza al menos un Gold
let sinGold = 0;
for (let i = 0; i < 100000; i++) {
  if (!elegirSinRepes(15, { packFull: true }).some(f => f.esGold)) sinGold++;
}
check(sinGold === 0, `Pack completo con >=1 Gold garantizado (100.000, ${sinGold} fallos)`);

// 4. Distribución ponderada (200.000 cajas individuales)
const cont = {};
const N = 200000;
for (let i = 0; i < N; i++) {
  const f = elegirSinRepes(1)[0];
  cont[f.slug] = (cont[f.slug] || 0) + 1;
}
let maxErr = 0;
console.log('\n  Distribución empírica (esperado = peso %):');
for (const m of MODELOS) {
  const obs = ((cont[m.slug] || 0) / N) * 100;
  const err = Math.abs(obs - m.peso);
  maxErr = Math.max(maxErr, err);
  console.log(`  ${m.n} ${String(m.slug).padEnd(8)} ${String(m.name).padEnd(26)} esperado ${String(m.peso).padEnd(5)}% → ${obs.toFixed(3)}%`);
}
check(maxErr < 0.3, `Desviación máxima vs esperado: ${maxErr.toFixed(3)}% (umbral 0.3%)`);

// 5. Gold Chrome ≈ 0.2% por caja (1/500)
let golds = 0;
const NG = 200000;
for (let i = 0; i < NG; i++) {
  if (elegirSinRepes(1)[0].esGold) golds++;
}
const goldPct = (golds / NG) * 100;
console.log(`  Gold observado: ${goldPct.toFixed(3)}% (esperado ${(GOLD_PROB * 100).toFixed(3)}%)`);
check(goldPct > 0.1 && goldPct < 0.35, `Gold dentro de rango razonable (0.1%-0.35%)`);

console.log('\n' + (ok ? 'TODOS LOS CHECKS OK' : 'HAY FALLOS'));
process.exit(ok ? 0 : 1);
