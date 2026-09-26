/**
 * SSCARS GARAGE — Cartas artísticas de los 15 modelos.
 *
 * Cada modelo de la colección tiene su propia carta: una lámina vertical
 * (1280×1792 px, proporción 5:7) con el número correlativo, el nombre artístico,
 * el OVR y las seis estadísticas. Es el arte que se usa:
 *
 *   1. En la web, como tercera vista de la ficha de cada modelo (delantera / trasera / carta).
 *   2. En Mi Garaje, como ilustración de la colección digital.
 *   3. Como arte imprimible para los lienzos de Printify (ver produccion/LIENZOS_PRINTIFY.md).
 *
 * Este módulo es la fuente de verdad en servidor. El espejo para el navegador es
 * `public/js/cartas-data.js` y `test/cartas.test.mjs` comprueba que no se desincronicen
 * y que exista el fichero de cada carta.
 *
 * Estadísticas de la carta: VEL (velocidad) · ACE (aceleración) · MAN (manejo)
 *                           POT (potencia)  · EST (estilo)      · RAR (rareza)
 */

const ART_DIR = 'images/cartas';          // arte optimizado que sirve la web
const PRINT_DIR = 'produccion/cartas';    // maestro de impresión (sin recomprimir)

export const CARTAS = [
  { n: '01', slug: 'r34',     name: 'El Emperador Azul',         rareza: 'legendario', ovr: 93, stats: { vel: 92, ace: 90, man: 88, pot: 94, est: 95, rar: 93 } },
  { n: '02', slug: 'r32',     name: 'El Monstruo Púrpura',       rareza: 'raro',       ovr: 92, stats: { vel: 91, ace: 88, man: 86, pot: 93, est: 90, rar: 94 } },
  { n: '03', slug: '350z',    name: 'Colmillo Azul',             rareza: 'raro',       ovr: 89, stats: { vel: 88, ace: 87, man: 90, pot: 89, est: 93, rar: 88 } },
  { n: '04', slug: 'supra',   name: 'La Bestia Naranja',         rareza: 'legendario', ovr: 94, stats: { vel: 93, ace: 90, man: 88, pot: 95, est: 96, rar: 94 } },
  { n: '05', slug: 'ae86',    name: 'El Fantasma de la Montaña', rareza: 'clasico',    ovr: 88, stats: { vel: 82, ace: 85, man: 94, pot: 80, est: 92, rar: 90 } },
  { n: '06', slug: 'mr2',     name: 'El Exótico de Bolsillo',    rareza: 'clasico',    ovr: 86, stats: { vel: 84, ace: 83, man: 92, pot: 82, est: 90, rar: 87 } },
  { n: '07', slug: 'rx7',     name: 'El Aullido Rotativo',       rareza: 'epico',      ovr: 90, stats: { vel: 90, ace: 88, man: 91, pot: 87, est: 94, rar: 91 } },
  { n: '08', slug: 'nsx',     name: 'El Samurái Rojo',           rareza: 'epico',      ovr: 91, stats: { vel: 90, ace: 87, man: 93, pot: 88, est: 91, rar: 92 } },
  { n: '09', slug: 'civic',   name: 'El Puño Blanco',            rareza: 'clasico',    ovr: 87, stats: { vel: 84, ace: 86, man: 90, pot: 83, est: 88, rar: 89 } },
  { n: '10', slug: 's2000',   name: 'El Grito Amarillo',         rareza: 'raro',       ovr: 88, stats: { vel: 86, ace: 87, man: 91, pot: 85, est: 89, rar: 88 } },
  { n: '11', slug: 'evo',     name: 'El Domador',                rareza: 'raro',       ovr: 89, stats: { vel: 87, ace: 89, man: 90, pot: 90, est: 88, rar: 89 } },
  { n: '12', slug: 'eclipse', name: 'Verde Veneno',              rareza: 'clasico',    ovr: 88, stats: { vel: 86, ace: 85, man: 88, pot: 86, est: 95, rar: 93 } },
  { n: '13', slug: '3000gt',  name: 'El Visionario',             rareza: 'clasico',    ovr: 87, stats: { vel: 85, ace: 84, man: 87, pot: 88, est: 89, rar: 86 } },
  { n: '14', slug: 'wrc',     name: 'El Azul del Rally',         rareza: 'raro',       ovr: 90, stats: { vel: 88, ace: 90, man: 92, pot: 89, est: 90, rar: 94 } },
  { n: '15', slug: 'lfa',     name: 'La Voz del V10',            rareza: 'epico',      ovr: 96, stats: { vel: 96, ace: 94, man: 92, pot: 97, est: 98, rar: 96 } }
].map((c) => {
  const base = `${c.n}-${c.slug}`;
  return {
    ...c,
    // Arte que sirve la web (WebP reoptimizado, 1000 px de ancho).
    arte: `${ART_DIR}/${base}.webp`,
    // Maestro de impresión: el fichero original tal cual se entregó, sin recomprimir.
    arteImpresion: `${PRINT_DIR}/${base}.webp`,
    // Colección de arte del modelo: las tres láminas que van al catálogo de lienzos.
    lienzos: ['delantera', 'trasera', 'carta']
  };
});

/** Carta de un modelo por slug. Devuelve undefined si el slug no existe. */
export function cartaDe(slug) {
  return CARTAS.find((c) => c.slug === slug);
}

/** Carta por número correlativo ('01'..'15'). */
export function cartaPorNumero(n) {
  const num = String(n).padStart(2, '0');
  return CARTAS.find((c) => c.n === num);
}

/** ID de producto de lienzo (Printify) para un modelo y una lámina. */
export function lienzoId(slug, arte) {
  return `lienzo-${slug}-${arte}`;
}
