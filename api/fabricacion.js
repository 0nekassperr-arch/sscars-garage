/**
 * Capa de fabricación (print-on-demand).
 * Selecciona el proveedor con la variable FABRICANTE (por defecto 'factory').
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
  // Adaptador genérico para taller de fabricación y resina.
  factory: {
    requiere: ['FACTORY_API_KEY', 'STL_BASE_URL'],
    async enviar(figura, direccion, orderId) {
      await fetchRetry(process.env.FACTORY_API_URL || 'https://api.factory-adapter.local/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': process.env.FACTORY_API_KEY },
        body: JSON.stringify({
          files: [{ url: fileUrl(figura.slug, figura.esGold) }],
          shipping_address: direccion,
          shipping_method: 'Standard',
          packaging: 'plain_box_no_logo',
          material: 'Resin',
          notes: `SSCARS ${figura.n} ${figura.name}${figura.esGold ? ' GOLD' : ''} · ${orderId}`
        })
      });
    }
  }
};

export async function pedirAFabrica(figura, direccion, orderId) {
  const nombre = process.env.FABRICANTE || 'factory';
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
