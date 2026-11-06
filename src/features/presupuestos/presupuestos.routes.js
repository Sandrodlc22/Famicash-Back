// Presupuestos mensuales/trimestrales/anuales por categoría (y opcionalmente subcategoría).
// Semáforo: VERDE < 80% · AMARILLO ≥ 80% y ≤ 100% · ROJO > 100%. Totales calculados desde los datos.
import { Router } from 'express';
import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';
import { resolverPeriodo } from '../../lib/utils/fechas.js';
import { toInt, num, round2 } from '../../lib/utils/filtros.js';

const router = Router();
const TIPOS = ['MENSUAL', 'TRIMESTRAL', 'ANUAL'];

const estado = (pct) => (pct > 100 ? 'ROJO' : pct >= 80 ? 'AMARILLO' : 'VERDE');

router.get('/', async (req, res) => {
  const tipo = String(req.query.periodoTipo || 'MENSUAL').toUpperCase();
  if (!TIPOS.includes(tipo)) throw new AppError('periodoTipo inválido.', 400);
  const p = resolverPeriodo(tipo, req.query.periodo);

  const [presupuestos, gastoCat, gastoSub] = await Promise.all([
    prisma.presupuesto.findMany({
      where: { periodoTipo: tipo, periodo: p.clave },
      include: { categoria: true, subcategoria: true },
      orderBy: [{ categoria: { orden: 'asc' } }, { subcategoriaId: 'asc' }]
    }),
    prisma.transaccion.groupBy({
      by: ['categoriaId'],
      where: { fecha: { gte: p.desde, lte: p.hasta } },
      _sum: { monto: true }
    }),
    prisma.transaccion.groupBy({
      by: ['subcategoriaId'],
      where: { fecha: { gte: p.desde, lte: p.hasta } },
      _sum: { monto: true }
    })
  ]);

  const realCat = new Map(gastoCat.map((g) => [g.categoriaId, num(g._sum.monto)]));
  const realSub = new Map(gastoSub.map((g) => [g.subcategoriaId, num(g._sum.monto)]));
  const catsConPresupuesto = new Set(presupuestos.filter((x) => !x.subcategoriaId).map((x) => x.categoriaId));

  let totalPresupuesto = 0, totalReal = 0;
  const items = presupuestos.map((x) => {
    const presupuesto = num(x.monto);
    const real = round2(x.subcategoriaId ? realSub.get(x.subcategoriaId) || 0 : realCat.get(x.categoriaId) || 0);
    const pct = presupuesto ? round2((real / presupuesto) * 100) : real > 0 ? 999 : 0;
    // Evitar doble conteo: una subcategoría solo suma al total si su categoría no tiene presupuesto propio
    const cuentaEnTotal = !x.subcategoriaId || !catsConPresupuesto.has(x.categoriaId);
    if (cuentaEnTotal) {
      totalPresupuesto += presupuesto;
      totalReal += real;
    }
    return {
      id: x.id,
      categoriaId: x.categoriaId,
      categoria: x.categoria.codigo,
      subcategoriaId: x.subcategoriaId,
      subcategoria: x.subcategoria?.codigo || null,
      presupuesto,
      real,
      disponible: round2(presupuesto - real),
      pct,
      estado: estado(pct),
      cuentaEnTotal
    };
  });

  const pctTotal = totalPresupuesto ? round2((totalReal / totalPresupuesto) * 100) : 0;
  res.json({
    periodo: { tipo, clave: p.clave, etiqueta: p.etiqueta },
    items,
    totales: {
      presupuesto: round2(totalPresupuesto),
      real: round2(totalReal),
      disponible: round2(totalPresupuesto - totalReal),
      pct: pctTotal,
      estado: estado(pctTotal)
    }
  });
});

/** Crea o actualiza (upsert lógico) un presupuesto */
router.put('/', async (req, res) => {
  const { periodoTipo, periodo, categoriaId, subcategoriaId, monto } = req.body || {};
  const tipo = String(periodoTipo || '').toUpperCase();
  if (!TIPOS.includes(tipo)) throw new AppError('periodoTipo inválido.', 400);
  const p = resolverPeriodo(tipo, periodo);
  const catId = toInt(categoriaId, 'categoriaId');
  const subId = subcategoriaId ? toInt(subcategoriaId, 'subcategoriaId') : null;
  const valor = round2(Number(monto));
  if (!Number.isFinite(valor) || valor < 0) throw new AppError('Monto inválido.', 400);
  if (subId) {
    const sub = await prisma.subcategoria.findUnique({ where: { id: subId } });
    if (!sub || sub.categoriaId !== catId) throw new AppError('La subcategoría no pertenece a la categoría.', 400);
  }

  const existente = await prisma.presupuesto.findFirst({
    where: { periodoTipo: tipo, periodo: p.clave, categoriaId: catId, subcategoriaId: subId }
  });
  const r = existente
    ? await prisma.presupuesto.update({ where: { id: existente.id }, data: { monto: valor } })
    : await prisma.presupuesto.create({
        data: { periodoTipo: tipo, periodo: p.clave, categoriaId: catId, subcategoriaId: subId, monto: valor }
      });
  res.json(r);
});

router.delete('/:id', async (req, res) => {
  await prisma.presupuesto.delete({ where: { id: toInt(req.params.id) } });
  res.json({ ok: true });
});

/** Copia los presupuestos del periodo anterior al actual (no sobrescribe existentes) */
router.post('/copiar-anterior', async (req, res) => {
  const tipo = String(req.body?.periodoTipo || '').toUpperCase();
  if (!TIPOS.includes(tipo)) throw new AppError('periodoTipo inválido.', 400);
  const p = resolverPeriodo(tipo, req.body?.periodo);
  const origen = await prisma.presupuesto.findMany({ where: { periodoTipo: tipo, periodo: p.anterior.clave } });
  const destino = await prisma.presupuesto.findMany({ where: { periodoTipo: tipo, periodo: p.clave } });
  const ya = new Set(destino.map((d) => `${d.categoriaId}-${d.subcategoriaId}`));
  const nuevos = origen
    .filter((o) => !ya.has(`${o.categoriaId}-${o.subcategoriaId}`))
    .map((o) => ({ periodoTipo: tipo, periodo: p.clave, categoriaId: o.categoriaId, subcategoriaId: o.subcategoriaId, monto: o.monto }));
  if (nuevos.length) await prisma.presupuesto.createMany({ data: nuevos });
  res.json({ copiados: nuevos.length, desde: p.anterior.clave });
});

export default router;

