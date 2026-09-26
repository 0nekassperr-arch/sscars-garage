import fs from 'fs';
import { CARTAS } from '../api/cartas.js';

const datos = CARTAS.map(({ n, slug, name, rareza, ovr, stats, arte, arteImpresion, lienzos }) =>
  ({ n, slug, name, rareza, ovr, stats, arte, arteImpresion, lienzos }));

const cabecera = `/**
 * SSCARS GARAGE — Cartas artísticas de los 15 modelos (espejo para el navegador).
 *
 * ⚠️ GENERADO: no editar a mano. La fuente de verdad es \`api/cartas.js\`;
 * para regenerar este fichero:  node tools/generar-cartas-web.mjs
 *
 * Estadísticas: VEL velocidad · ACE aceleración · MAN manejo · POT potencia
 *               EST estilo    · RAR rareza
 */
`;

const cuerpo = `(function (global) {
  'use strict';

  const lista = ${JSON.stringify(datos, null, 2)};

  const porSlug = {};
  const porNumero = {};
  lista.forEach((c) => {
    porSlug[c.slug] = c;
    porNumero[c.n] = c;
  });

  global.SSCARS_CARTAS = {
    lista,
    porSlug,
    porNumero,
    /** Carta de un modelo por slug. */
    cartaDe: (slug) => porSlug[slug] || null,
    /** Carta de un modelo por número correlativo ('01'..'15'). */
    cartaPorNumero: (n) => porNumero[String(n).padStart(2, '0')] || null,
    /** ID de producto de lienzo (Printify) para un modelo y una lámina. */
    lienzoId: (slug, arte) => \`lienzo-\${slug}-\${arte}\`,
    /** Etiquetas legibles de las seis estadísticas. */
    ETIQUETAS: { vel: 'VEL', ace: 'ACE', man: 'MAN', pot: 'POT', est: 'EST', rar: 'RAR' }
  };
})(typeof window !== 'undefined' ? window : this);
`;

fs.writeFileSync('public/js/cartas-data.js', cabecera + cuerpo);
console.log('escrito public/js/cartas-data.js con', datos.length, 'cartas');
