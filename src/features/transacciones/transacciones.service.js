import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';
import { hoyLima, parseFecha, formatFecha } from '../../lib/utils/fechas.js';
import { construirFiltro, toInt, num, round2 } from '../../lib/utils/filtros.js';

const CLASES = ['Cotidiano', 'Fijo', 'Extra'];

export function serializar(t) {
  return {
    id: t.id,
    fecha: formatFecha(t.fecha),
    tipo: t.tipo,
    categoriaId: t.categoriaId,
    subcategoriaId: t.subcategoriaId,
    detalleId: t.detalleId,
    medioPagoId: t.medioPagoId,
    categoria: t.categoriaNombre,
    subcategoria: t.subcategoriaNombre,
    detalle: t.detalleNombre,
    medioPago: t.medioPagoNombre,
    monto: num(t.monto),
    persona: t.persona,
    clase: t.clase,
    observaciones: t.observaciones,
    creadoPor: t.creadoPor?.nombre || null,
    creadoEn: t.creadoEn
  };
}

/** Valida coherencia de la taxonomía y arma los datos con snapshot de nombres */
async function prepararDatos(body, parcialDe = null) {
  const src = { ...(parcialDe || {}), ...body };
  const subcategoriaId = toInt(src.subcategoriaId, 'subcategoriaId');
  const sub = await prisma.subcategoria.findUnique({ where: { id: subcategoriaId }, include: { categoria: true } });
  if (!sub) throw new AppError('La subcategoría no existe.', 400);

  let detalle = null;
  if (src.detalleId) {
    detalle = await prisma.detalle.findUnique({ where: { id: toInt(src.detalleId, 'detalleId') } });
    if (!detalle || detalle.subcategoriaId !== sub.id) {
      throw new AppError('El detalle no pertenece a la subcategoría seleccionada.', 400);
    }
  }

  let medio = null;
  if (src.medioPagoId) {
    medio = await prisma.medioPago.findUnique({ where: { id: toInt(src.medioPagoId, 'medioPagoId') } });
    if (!medio) throw new AppError('El medio de pago no existe.', 400);
  }

  const monto = round2(Number(src.monto));
  if (!Number.isFinite(monto) || monto <= 0) throw new AppError('El monto debe ser mayor a 0.', 400);
  if (monto > 9999999999) throw new AppError('El monto es demasiado alto.', 400);

  const observaciones = src.observaciones ? String(src.observaciones).trim().slice(0, 500) : null;
  const clase = CLASES.includes(src.clase) ? src.clase : null;

  return {
    fecha: parseFecha(src.fecha || hoyLima()),
    tipo: sub.categoria.tipo,
    categoriaId: sub.categoriaId,
    subcategoriaId: sub.id,
    detalleId: detalle?.id || null,
    medioPagoId: medio?.id || null,
    monto,
    persona: sub.persona || sub.categoria.persona,
    clase,
    observaciones: observaciones || null,
    categoriaNombre: sub.categoria.codigo,
    subcategoriaNombre: sub.codigo,
    detalleNombre: detalle?.nombre || null,
    medioPagoNombre: medio?.nombre || null
  };
}

export async function crear(body, usuarioId) {
  const data = await prepararDatos(body);
  const t = await prisma.transaccion.create({ data: { ...data, creadoPorId: usuarioId }, include: { creadoPor: true } });
  return serializar(t);
}

export async function actualizar(id, body) {
  const actual = await prisma.transaccion.findUnique({ where: { id } });
  if (!actual) throw new AppError('Transacción no encontrada.', 404);
  const base = {
    subcategoriaId: actual.subcategoriaId,
    detalleId: actual.detalleId,
    medioPagoId: actual.medioPagoId,
    monto: num(actual.monto),
    fecha: formatFecha(actual.fecha),
    clase: actual.clase,
    observaciones: actual.observaciones
  };
  const data = await prepararDatos(body, base);
  const t = await prisma.transaccion.update({ where: { id }, data, include: { creadoPor: true } });
  return serializar(t);
}

export async function eliminar(id) {
  await prisma.transaccion.delete({ where: { id } });
}

export async function obtener(id) {
  const t = await prisma.transaccion.findUnique({ where: { id }, include: { creadoPor: true } });
  if (!t) throw new AppError('Transacción no encontrada.', 404);
  return serializar(t);
}

/** Listado paginado + totales por tipo del conjunto filtrado completo */
export async function listar(query) {
  const where = construirFiltro(query);
  const limite = Math.min(Math.max(parseInt(query.limite, 10) || 50, 1), 500);
  const pagina = Math.max(parseInt(query.pagina, 10) || 1, 1);

  const [items, total, porTipo] = await Promise.all([
    prisma.transaccion.findMany({
      where,
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
      skip: (pagina - 1) * limite,
      take: limite,
      include: { creadoPor: true }
    }),
    prisma.transaccion.count({ where }),
    prisma.transaccion.groupBy({ by: ['tipo'], where, _sum: { monto: true } })
  ]);

  const totales = { INGRESO: 0, GASTO: 0, AHORRO: 0 };
  porTipo.forEach((g) => (totales[g.tipo] = round2(num(g._sum.monto))));

  return {
    items: items.map(serializar),
    pagina,
    limite,
    total,
    paginas: Math.ceil(total / limite),
    totales
  };
}

