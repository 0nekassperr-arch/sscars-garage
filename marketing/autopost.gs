/**
 * SSCARS GARAGE — Autopost Instagram + Threads (Google Apps Script)
 * ------------------------------------------------------------------
 * Flujo: un disparador diario coge el siguiente coche de CONTENIDO,
 * genera un caption (con Gemini gratis o plantilla) y publica la foto
 * de la figura en Instagram y Threads. Coste: 0 €.
 *
 * SETUP (una vez, ver marketing/README.md):
 *  1. Cuenta de Instagram "Professional" + página de Facebook vinculada.
 *  2. App en developers.facebook.com con permisos:
 *     instagram_basic, instagram_content_publish, threads (publish).
 *  3. Rellena CONFIG con tus ids y token.
 *  4. Ejecuta setupTrigger() una sola vez.
 */

const CONFIG = {
  IG_USER_ID: 'XXX',           // id de la cuenta de Instagram (de la app de Meta)
  IG_ACCESS_TOKEN: 'XXX',      // token largo de Meta Graph API
  THREADS_USER_ID: 'XXX',      // id de la cuenta de Threads (misma app de Meta)
  GEMINI_API_KEY: '',          // opcional: clave de Google AI Studio (captions IA)
  IMG_BASE: 'https://sscarsgarage.vercel.app/images/',
  PROP_INDEX: 'sscars_ultimo_idx'
};

// 15 coches: slug (nombre de la foto), figura, coche real y gancho de historia.
const CONTENIDO = [
  { slug:'r34',     figura:'El Emperador Azul',      coche:'Nissan Skyline GT-R R34 · 1999',   historia:'El «Godzilla» definitivo. Con su RB26 biturbo y el ATTESA E-TS, reinaba en la Wangan a las 3 de la mañana, cuando nadie se atrevía a plantarle cara.' },
  { slug:'r32',     figura:'El Monstruo Púrpura',    coche:'Nissan Skyline GT-R R32 · 1989',   historia:'Resucitó la leyenda GT-R y arrasó en el Grupo A con tanta autoridad que cambiaron las reglas solo para frenarlo. Midnight Purple y pura intimidación.' },
  { slug:'350z',    figura:'Colmillo Azul',          coche:'Nissan 350Z · 2002',               historia:'El Z que devolvió el equilibrio entre potencia y peso. El V6 VQ35DE lo convirtió en la base favorita del drift en los tandems japoneses.' },
  { slug:'supra',   figura:'La Bestia Naranja',      coche:'Toyota Supra MK4 · 1993',          historia:'El 2JZ-GTE es el seis cilindros más venerado del tuning: aguanta el doble o el triple de su potencia de serie sin pestañear.' },
  { slug:'ae86',    figura:'El Fantasma de la Montaña', coche:'Toyota AE86 Sprinter Trueno · 1983', historia:'El «Hachi-Roku». No era el más potente, pero pesaba nada y se bailaba en el touge como ninguno. La técnica vence a la potencia.' },
  { slug:'mr2',     figura:'El Exótico de Bolsillo', coche:'Toyota MR2 · 1989',                historia:'Motor central y tracción trasera por la mitad de todo. El «Ferrari de bolsillo» llevó la emoción de los grandes exóticos a la calle.' },
  { slug:'rx7',     figura:'El Aullido Rotativo',    coche:'Mazda RX-7 FD3S · 1992',           historia:'Un motor sin pistones. El rotativo 13B-REW giraba tan alto y sonaba tan agudo que no se confunde con nada. Una reliquia de los clubes nocturnos.' },
  { slug:'nsx',     figura:'El Samurái Rojo',        coche:'Honda NSX · 1990',                 historia:'Honda quiso un superdeportivo fiable y preciso como un bisturí, y contó con Ayrton Senna en su puesta a punto. El primer supercoche de todos los días.' },
  { slug:'civic',   figura:'El Puño Blanco',         coche:'Honda Civic EK9 Type R · 1997',    historia:'Un 1.6 atmosférico que grita hasta las 9.000 vueltas. El VTEC del B16B convertía cada subida de vueltas en una celebración.' },
  { slug:'s2000',   figura:'El Grito Amarillo',      coche:'Honda S2000 · 1999',               historia:'Descapotable, atmosférico y con la zona roja más alta de su época: 9.000 rpm que se clavan en la memoria. Puro motor a cielo abierto.' },
  { slug:'evo',     figura:'El Domador',             coche:'Mitsubishi Lancer Evolution · 1992', historia:'Nacido para homologar el Grupo A del Mundial de Rallies: tracción total, turbo y un hambre de curvas descomunal.' },
  { slug:'eclipse', figura:'Verde Veneno',           coche:'Mitsubishi Eclipse · 1995',        historia:'Con su 4G63 turbo y ese verde fósforo de alerón descomunal, es la cara más reconocible del tuning de los 2000.' },
  { slug:'3000gt',  figura:'El Visionario',          coche:'Mitsubishi 3000GT VR-4 · 1990',   historia:'V6 biturbo, tracción total, aerodinámica activa y hasta dirección en las cuatro ruedas: tecnología veinte años por delante de su tiempo.' },
  { slug:'wrc',     figura:'El Azul del Rally',      coche:'Subaru Impreza WRX STI · 1998',    historia:'Azul rally, llantas doradas y el rugido del bóxer. De la mano de Colin McRae, escribió la página más gloriosa del rally japonés.' },
  { slug:'lfa',     figura:'La Voz del V10',         coche:'Lexus LFA · 2010',                 historia:'Diez cilindros atmosféricos afinados junto a Yamaha para rugir como un Fórmula 1. Solo se fabricaron 500 unidades.' }
];

function buildCaption(item) {
  const pie = `Colección limitada de 15 leyendas JDM en caja sorpresa. Sin repetidos dentro del pack. Gold Chrome 1/500. Envío gratis.`;
  if (CONFIG.GEMINI_API_KEY) {
    try {
      const prompt = `Escribe un caption para Instagram/Threads en español, natural y con gancho, para promocionar una figura de colección estilo "chibi" de un coche JDM. NO inventes datos: usa solo esta info.\nFigura: ${item.figura}\nCoche real: ${item.coche}\nHistoria: ${item.historia}\nPie de cierre (textual): ${pie}\nAñade 5-6 hashtags JDM relevantes y 1 emoji por frase como mucho. Máximo 2000 caracteres.`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
      const r = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const j = JSON.parse(r.getContentText());
      return j.candidates[0].content.parts[0].text.trim();
    } catch (e) {
      console.log('Gemini falló, uso plantilla:', e.message);
    }
  }
  return `${item.figura} — ${item.coche}\n\n${item.historia}\n\n${pie}\n\n#JDM #CarCulture #BlindBox #${item.coche.split(' ')[0]} #Coleccionismo #JDMCollectibles`;
}

function postInstagram(imageUrl, caption) {
  if (CONFIG.IG_USER_ID === 'XXX') throw new Error('Rellena CONFIG antes de publicar');
  const base = 'https://graph.facebook.com/v21.0';
  const r1 = UrlFetchApp.fetch(`${base}/${CONFIG.IG_USER_ID}/media`, {
    method: 'post',
    payload: { image_url: imageUrl, caption: caption, access_token: CONFIG.IG_ACCESS_TOKEN }
  });
  const creationId = JSON.parse(r1.getContentText()).id;
  const r2 = UrlFetchApp.fetch(`${base}/${CONFIG.IG_USER_ID}/media_publish`, {
    method: 'post',
    payload: { creation_id: creationId, access_token: CONFIG.IG_ACCESS_TOKEN }
  });
  return JSON.parse(r2.getContentText()).id;
}

function postThreads(imageUrl, caption) {
  if (CONFIG.THREADS_USER_ID === 'XXX') throw new Error('Rellena CONFIG antes de publicar');
  const base = 'https://graph.threads.net/v1.0';
  const r1 = UrlFetchApp.fetch(`${base}/${CONFIG.THREADS_USER_ID}/threads`, {
    method: 'post',
    payload: { media_type: 'IMAGE', text: caption, image_url: imageUrl, access_token: CONFIG.IG_ACCESS_TOKEN }
  });
  const creationId = JSON.parse(r1.getContentText()).id;
  const r2 = UrlFetchApp.fetch(`${base}/${CONFIG.THREADS_USER_ID}/threads_publish`, {
    method: 'post',
    payload: { creation_id: creationId, access_token: CONFIG.IG_ACCESS_TOKEN }
  });
  return JSON.parse(r2.getContentText()).id;
}

function dailyPost() {
  const props = PropertiesService.getScriptProperties();
  const prev = parseInt(props.getProperty(CONFIG.PROP_INDEX) || '-1', 10);
  const idx = (prev + 1) % CONTENIDO.length;
  const item = CONTENIDO[idx];
  const imageUrl = CONFIG.IMG_BASE + item.slug + '-front.webp';
  const caption = buildCaption(item);

  const out = { fecha: new Date().toISOString(), slug: item.slug };
  try { out.instagram = postInstagram(imageUrl, caption); } catch (e) { out.instagram = 'ERROR: ' + e.message; }
  try { out.threads = postThreads(imageUrl, caption); } catch (e) { out.threads = 'ERROR: ' + e.message; }

  props.setProperty(CONFIG.PROP_INDEX, String(idx));
  console.log(JSON.stringify(out));
  return out;
}

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyPost').timeBased().everyDays(1).atHour(13).create();
  console.log('Trigger diario creado a las 13:00. Ejecuta dailyPost() manualmente para probar.');
}
