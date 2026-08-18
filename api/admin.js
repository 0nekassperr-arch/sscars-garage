import { readOrders, kvReady } from './_lib.js';

/** Panel privado mínimo: /api/admin?key=ADMIN_KEY */
export default async function handler(req, res) {
  const key = req.query?.key || '';
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'no autorizado' });
  }
  const orders = await readOrders(200);
  const figuras = orders.flatMap(o => o.figuras || []);
  const porModelo = {};
  for (const f of figuras) porModelo[`${f.n} ${f.name}`] = (porModelo[`${f.n} ${f.name}`] || 0) + 1;

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    persistencia: kvReady ? 'upstash' : 'memoria (configura UPSTASH_* para histórico real)',
    pedidos: orders.length,
    figurasEnviadas: figuras.length,
    golds: figuras.filter(f => f.esGold).length,
    pendientesDeFabricar: orders.reduce((a, o) => a + (o.pendientes || 0), 0),
    porModelo,
    ultimos: orders.slice(0, 25)
  });
}
