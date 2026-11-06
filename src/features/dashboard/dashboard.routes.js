// Dashboard: resumen (sección 6.1), evolutivo mensual (6.2) y gastos por nivel (6.4/6.5).
// Todas las cifras se calculan desde las transacciones filtradas → los totales siempre cuadran.
import { Router } from 'express';
import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';
import { periodoDesdeQuery, formatFecha, MESES_ABREV, hoyLima } from '../../lib/utils/fechas.js';
import { construirFiltro, num, round2 } from '../../lib/utils/filtros.js';

const router = Router();

async function totalesPorTipo(where) {
  const g = await prisma.transaccion.groupBy({ by: ['tipo'], where, _sum: { monto: true } });
  const t = { INGRESO: 0, GASTO: 0, AHORRO: 0 };
  g.forEach((x) => (t[x.tipo] = num(x._sum.monto)));
  // Fórmulas oficiales del brief:
  const ingresos = round2(t.INGRESO);
  const gastos = round2(t.GASTO); // II_GENERALES + III_LARA + IV_VANESSA + V_ANTHONY (excluye ahorro)
  const ahorros = round2(t.AHORRO);
  const disponible = round2(ingresos - gastos);
  const total = round2(disponible - ahorros); // Defecto: Disponible − Ahorros
  return { ingresos, gastos, disponible, ahorros, total };
}

const variacion = (actual, anterior) =>
  anterior === 0 ? (actual === 0 ? 0 : null) : round2(((actual - anterior) / Math.abs(anterior)) * 100);

/** GET /dashboard/resumen */
router.get('/resumen', async (req, res) => {
  const periodo = periodoDesdeQuery(req.query);
  const filtrosSinFecha = { ...req.query, desde: undefined, hasta: undefined };
  const whereActual = construirFiltro(filtrosSinFecha, periodo);
  const whereAnterior = construirFiltro(filtrosSinFecha, periodo.anterior);

  const [actual, anterior, porCategoria, categorias] = await Promise.all([
    totalesPorTipo(whereActual),
    totalesPorTipo(whereAnterior),
    prisma.transaccion.groupBy({
      by: ['categoriaId'],
      where: { ...whereActual, tipo: 'GASTO' },
      _sum: { monto: true }
    }),
    prisma.categoria.findMany({ select: { id: true, codigo: true, orden: true } })
  ]);

  const mapCat = new Map(categorias.map((c) => [c.id, c]));
  const totalGastos = actual.gastos;
  const distribucion = porCategoria
    .map((g) => {
      const monto = round2(num(g._sum.monto));
      const c = mapCat.get(g.categoriaId);
      return {
        categoriaId: g.categoriaId,
        categoria: c?.codigo || '—',
        orden: c?.orden || 0,
        monto,
        pct: totalGastos ? round2((monto / totalGastos) * 100) : 0
      };
    })
    .sort((a, b) => b.monto - a.monto);

  const vars = {};
  for (const k of Object.keys(actual)) vars[k] = variacion(actual[k], anterior[k]);

  res.json({
    periodo: {
      tipo: periodo.tipo,
      clave: periodo.clave,
      etiqueta: periodo.etiqueta,
      desde: formatFecha(periodo.desde),
      hasta: formatFecha(periodo.hasta)
    },
    actual,
    anterior,
    variacion: vars,
    distribucion
  });
});

/**
 * GET /dashboard/evolutivo
 *  ?rango=6M | 12M | ANIO (con ?anio=2026) | PERSONALIZADO (?desdeMes=2026-01&hastaMes=2026-06)
 */
router.get('/evolutivo', async (req, res) => {
  const hoy = hoyLima();
  const yHoy = +hoy.slice(0, 4), mHoy = +hoy.slice(5, 7) - 1;
  const rango = String(req.query.rango || '6M').toUpperCase();
  let ini, fin; // índices absolutos de mes (año*12+mes)

  if (rango === 'ANIO') {
    const y = parseInt(req.query.anio, 10) || yHoy;
    ini = y * 12; fin = y * 12 + 11;
  } else if (rango === 'PERSONALIZADO') {
    const p = (s) => {
      const m = /^(\d{4})-(\d{2})$/.exec(s || '');
      if (!m) throw new AppError('Use formato YYYY-MM en desdeMes y hastaMes.', 400);
      return +m[1] * 12 + (+m[2] - 1);
    };
    ini = p(req.query.desdeMes); fin = p(req.query.hastaMes);
    if (fin < ini) [ini, fin] = [fin, ini];
    if (fin - ini > 59) throw new AppError('El rango máximo es de 60 meses.', 400);
  } else {
    const n = rango === '12M' ? 12 : 6;
    fin = yHoy * 12 + mHoy; ini = fin - (n - 1);
  }

  const desde = new Date(Date.UTC(Math.floor(ini / 12), ini % 12, 1));
  const hasta = new Date(Date.UTC(Math.floor(fin / 12), (fin % 12) + 1, 0));
  const where = construirFiltro({ ...req.query, desde: undefined, hasta: undefined }, { desde, hasta });

  // Agregamos por día y tipo en BD; luego consolidamos por mes (≤ ~1.800 filas/año en el peor caso)
  const filas = await prisma.transaccion.groupBy({ by: ['fecha', 'tipo'], where, _sum: { monto: true } });

  const meses = [];
  for (let i = ini; i <= fin; i++) {
    const y = Math.floor(i / 12), m = i % 12;
    meses.push({ mes: `${y}-${String(m + 1).padStart(2, '0')}`, etiqueta: `${MESES_ABREV[m]} ${String(y).slice(2)}`, ingresos: 0, gastos: 0, ahorro: 0 });
  }
  for (const f of filas) {
    const idx = f.fecha.getUTCFullYear() * 12 + f.fecha.getUTCMonth() - ini;
    const key = f.tipo === 'INGRESO' ? 'ingresos' : f.tipo === 'GASTO' ? 'gastos' : 'ahorro';
    if (meses[idx]) meses[idx][key] += num(f._sum.monto);
  }
  meses.forEach((m) => {
    m.ingresos = round2(m.ingresos);
    m.gastos = round2(m.gastos);
    m.ahorro = round2(m.ahorro);
  });

  const totales = meses.reduce(
    (a, m) => ({ ingresos: a.ingresos + m.ingresos, gastos: a.gastos + m.gastos, ahorro: a.ahorro + m.ahorro }),
    { ingresos: 0, gastos: 0, ahorro: 0 }
  );
  res.json({
    desde: formatFecha(desde),
    hasta: formatFecha(hasta),
    meses,
    totales: { ingresos: round2(totales.ingresos), gastos: round2(totales.gastos), ahorro: round2(totales.ahorro) }
  });
});

/**
 * GET /dashboard/por-nivel?nivel=categoria|subcategoria|detalle&tipo=GASTO + periodo + filtros
 * Devuelve filas { id, nombre, padre, monto, pct, cantidad } ordenadas por monto.
 */
router.get('/por-nivel', async (req, res) => {
  const nivel = String(req.query.nivel || 'categoria').toLowerCase();
  const campo = { categoria: 'categoriaId', subcategoria: 'subcategoriaId', detalle: 'detalleId' }[nivel];
  if (!campo) throw new AppError('Nivel inválido (categoria | subcategoria | detalle).', 400);

  const periodo = periodoDesdeQuery(req.query);
  const q = { ...req.query, desde: undefined, hasta: undefined, tipo: req.query.tipo || 'GASTO' };
  const where = construirFiltro(q, periodo);

  const grupos = await prisma.transaccion.groupBy({
    by: [campo],
    where,
    _sum: { monto: true },
    _count: { _all: true }
  });

  const ids = grupos.map((g) => g[campo]).filter(Boolean);
  let nombres = new Map();
  if (nivel === 'categoria') {
    const rows = await prisma.categoria.findMany({ where: { id: { in: ids } } });
    nombres = new Map(rows.map((r) => [r.id, { nombre: r.codigo, padre: null }]));
  } else if (nivel === 'subcategoria') {
    const rows = await prisma.subcategoria.findMany({ where: { id: { in: ids } }, include: { categoria: true } });
    nombres = new Map(rows.map((r) => [r.id, { nombre: r.codigo, padre: r.categoria.codigo, padreId: r.categoriaId }]));
  } else {
    const rows = await prisma.detalle.findMany({ where: { id: { in: ids } }, include: { subcategoria: true } });
    nombres = new Map(rows.map((r) => [r.id, { nombre: r.nombre, padre: r.subcategoria.codigo, padreId: r.subcategoriaId }]));
  }

  const total = round2(grupos.reduce((s, g) => s + num(g._sum.monto), 0));
  const items = grupos
    .map((g) => {
      const monto = round2(num(g._sum.monto));
      const info = nombres.get(g[campo]) || { nombre: '(Sin detalle)', padre: null };
      return { id: g[campo], ...info, monto, cantidad: g._count._all, pct: total ? round2((monto / total) * 100) : 0 };
    })
    .sort((a, b) => b.monto - a.monto);

  res.json({
    periodo: { tipo: periodo.tipo, clave: periodo.clave, etiqueta: periodo.etiqueta, desde: formatFecha(periodo.desde), hasta: formatFecha(periodo.hasta) },
    nivel,
    total,
    items
  });
});

export default router;

