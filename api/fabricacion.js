/**
 * Capa de fabricación (print-on-demand).
 * Selecciona el proveedor con la variable FABRICANTE (por defecto 'jlc3dp').
 * Cada adaptador declara `requiere` (variables de entorno obligatorias) y
 * `enviar(figura, direccion, orderId)`.
 *
 * Si falta configuración, la función devuelve { ok:false } y el pedido queda en
 * "modo manual" (se avisa por email desde order.js). Así la tienda puede cobrar
 * desde el día uno aunque el proveedor aún no esté conectado.
 */
import { fetchRetry } from './_lib.js';

const MODEL_EXT = process.env.MODEL_EXT || 'stl';
const fileUrl = (slug, gold) => `${process.env.STL_BASE_URL}/${slug}${gold ? '-gold' : ''}.${MODEL_EXT}`;

const PROVEEDORES = {
  // Resina mono por API (ya integrado). Nota: sin color real.
  jlc3dp: {
    requiere: ['JLC_API_KEY', 'STL_BASE_URL'],
    async enviar(figura, direccion, orderId) {
      await fetchRetry('https://api.jlc3dp.com/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': process.env.JLC_API_KEY },
        body: JSON.stringify({
          files: [{ url: fileUrl(figura.slug, figura.esGold) }],
          shipping_address: direccion,
          shipping_method: 'DHL',
          packaging: 'plain_box_no_logo',
          material: 'X Resin',
          notes: `SSCARS ${figura.n} ${figura.name}${figura.esGold ? ' GOLD' : ''} · ${orderId}`
        })
      });
    }
  }

  // Para añadir otro proveedor (Printeers, Shapeways, Marketiger3D...), copia el
  // bloque de arriba con su endpoint, cabeceras y payload. Ejemplo:
  //
  // printeers: {
  //   requiere: ['PRINTEERS_API_KEY', 'STL_BASE_URL'],
  //   async enviar(figura, direccion, orderId) {
  //     await fetchRetry('https://.../order', {
  //       method: 'POST',
  //       headers: { Authorization: `Bearer ${process.env.PRINTEERS_API_KEY}`, 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ model_url: fileUrl(figura.slug, figura.esGold), shipping: direccion, order_id: orderId })
  //     });
  //   }
  // }
};

export async function pedirAFabrica(figura, direccion, orderId) {
  const nombre = process.env.FABRICANTE || 'jlc3dp';
  const prov = PROVEEDORES[nombre];
  if (!prov) return { ok: false, motivo: `FABRICANTE desconocido: ${nombre}` };

  const faltan = prov.requiere.filter((k) => !process.env[k]);
  if (faltan.length) {
    return { ok: false, motivo: `API de fabricación no configurada (faltan ${faltan.join(', ')}) — modo manual` };
  }

  try {
    await prov.enviar(figura, direccion, orderId);
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: e.message };
  }
}
