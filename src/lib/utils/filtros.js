// Constructor de filtros reutilizable para transacciones (usado por listados,
// dashboard, reportes y exportación) — garantiza que los totales cuadren
// exactamente con las transacciones filtradas.
import { AppError } from '../errors/app-error.js';
import { parseFecha } from './fechas.js';

const TIPOS = ['INGRESO', 'GASTO', 'AHORRO'];
const PERSONAS = ['FAMILIA', 'ANTHONY', 'VANESSA', 'LARA'];

export function csvInts(v) {
  if (v === undefined || v === null || v === '') return [];
  const arr = Array.isArray(v) ? v : String(v).split(',');
  return arr.map((x) => parseInt(x, 10)).filter((n) => Number.isInteger(n));
}

export function csvEnum(v, permitidos) {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : String(v).split(',');
  return arr.map((x) => x.trim().toUpperCase()).filter((x) => permitidos.includes(x));
}

export function toInt(v, campo = 'id') {
  const n = parseInt(v, 10);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(`${campo} inválido.`, 400);
  return n;
}

/**
 * Construye el `where` de Prisma a partir de query params.
 * Soporta: desde, hasta, tipo, categoriaIds, subcategoriaIds, detalleIds,
 * medioPagoIds, persona, clase, q (búsqueda en observaciones/detalle).
 * `rango` opcional ({desde, hasta}) tiene prioridad sobre desde/hasta.
 */
export function construirFiltro(q = {}, rango = null) {
  const where = {};
  const desde = rango?.desde || (q.desde ? parseFecha(q.desde, 'desde') : null);
  const hasta = rango?.hasta || (q.hasta ? parseFecha(q.hasta, 'hasta') : null);
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = desde;
    if (hasta) where.fecha.lte = hasta;
  }

  const tipos = csvEnum(q.tipo, TIPOS);
  if (tipos.length) where.tipo = { in: tipos };

  const cats = csvInts(q.categoriaIds);
  if (cats.length) where.categoriaId = { in: cats };
  const subs = csvInts(q.subcategoriaIds);
  if (subs.length) where.subcategoriaId = { in: subs };
  const dets = csvInts(q.detalleIds);
  if (dets.length) where.detalleId = { in: dets };
  const medios = csvInts(q.medioPagoIds);
  if (medios.length) where.medioPagoId = { in: medios };

  const personas = csvEnum(q.persona, PERSONAS);
  if (personas.length) where.persona = { in: personas };

  if (q.clase) where.clase = String(q.clase);

  if (q.q && String(q.q).trim()) {
    const term = String(q.q).trim();
    where.OR = [
      { observaciones: { contains: term, mode: 'insensitive' } },
      { detalleNombre: { contains: term, mode: 'insensitive' } },
      { subcategoriaNombre: { contains: term, mode: 'insensitive' } }
    ];
  }
  return where;
}

export const num = (d) => (d === null || d === undefined ? 0 : Number(d));
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

