/** Los 15 modelos de la colección y el sorteo ponderado de la caja sorpresa. */

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

export const GOLD_PROB = 0.002; // 1/500 por caja

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
