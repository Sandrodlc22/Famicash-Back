// Utilidades de fecha y periodos — zona horaria America/Lima.
// Las fechas de transacciones se guardan como DATE (sin hora): se representan como
// Date en UTC medianoche para evitar desfases de zona horaria.
import { AppError } from '../errors/app-error.js';

export const TZ = 'America/Lima';
export const MESES_ABREV = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
export const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Fecha de hoy en Lima como 'YYYY-MM-DD' */
export function hoyLima() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** 'YYYY-MM-DD' → Date UTC medianoche */
export function parseFecha(str, campo = 'fecha') {
  if (str instanceof Date) return new Date(Date.UTC(str.getUTCFullYear(), str.getUTCMonth(), str.getUTCDate()));
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(str || ''));
  if (!m) throw new AppError(`El campo ${campo} debe tener formato YYYY-MM-DD.`, 400);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1) throw new AppError(`La ${campo} no es válida.`, 400);
  return d;
}

/** Date → 'YYYY-MM-DD' */
export function formatFecha(d) {
  return d.toISOString().slice(0, 10);
}

const utc = (y, m, d) => new Date(Date.UTC(y, m, d));

/**
 * Resuelve un periodo a un rango de fechas.
 *  tipo: MENSUAL (ref '2026-11'), TRIMESTRAL ('2026-Q4'), ANUAL ('2026')
 * Devuelve { tipo, clave, etiqueta, desde, hasta, anterior: { clave, desde, hasta } }
 */
export function resolverPeriodo(tipoRaw = 'MENSUAL', ref) {
  const tipo = String(tipoRaw).toUpperCase();
  const hoy = hoyLima();
  const yHoy = +hoy.slice(0, 4);
  const mHoy = +hoy.slice(5, 7) - 1;

  if (tipo === 'MENSUAL') {
    const m = /^(\d{4})-(\d{2})$/.exec(ref || '') || [null, yHoy, String(mHoy + 1)];
    const y = +m[1], mes = +m[2] - 1;
    const prev = utc(y, mes - 1, 1);
    return {
      tipo,
      clave: `${y}-${String(mes + 1).padStart(2, '0')}`,
      etiqueta: `${MESES_LARGO[mes]} ${y}`,
      desde: utc(y, mes, 1),
      hasta: utc(y, mes + 1, 0),
      anterior: {
        clave: `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`,
        desde: prev,
        hasta: utc(y, mes, 0)
      }
    };
  }
  if (tipo === 'TRIMESTRAL') {
    const m = /^(\d{4})-Q([1-4])$/i.exec(ref || '') || [null, yHoy, Math.floor(mHoy / 3) + 1];
    const y = +m[1], q = +m[2];
    const pq = q === 1 ? 4 : q - 1, py = q === 1 ? y - 1 : y;
    return {
      tipo,
      clave: `${y}-Q${q}`,
      etiqueta: `T${q} ${y}`,
      desde: utc(y, (q - 1) * 3, 1),
      hasta: utc(y, q * 3, 0),
      anterior: { clave: `${py}-Q${pq}`, desde: utc(py, (pq - 1) * 3, 1), hasta: utc(py, pq * 3, 0) }
    };
  }
  if (tipo === 'ANUAL') {
    const y = /^\d{4}$/.test(ref || '') ? +ref : yHoy;
    return {
      tipo,
      clave: String(y),
      etiqueta: `Año ${y}`,
      desde: utc(y, 0, 1),
      hasta: utc(y, 11, 31),
      anterior: { clave: String(y - 1), desde: utc(y - 1, 0, 1), hasta: utc(y - 1, 11, 31) }
    };
  }
  throw new AppError('Tipo de periodo inválido (MENSUAL | TRIMESTRAL | ANUAL).', 400);
}

/** Periodo personalizado desde/hasta, con periodo anterior de igual duración */
export function resolverRango(desdeStr, hastaStr) {
  const desde = parseFecha(desdeStr, 'desde');
  const hasta = parseFecha(hastaStr, 'hasta');
  if (hasta < desde) throw new AppError('La fecha "hasta" debe ser posterior a "desde".', 400);
  const dias = Math.round((hasta - desde) / 86400000) + 1;
  return {
    tipo: 'PERSONALIZADO',
    clave: `${formatFecha(desde)}_${formatFecha(hasta)}`,
    etiqueta: `${formatFecha(desde)} → ${formatFecha(hasta)}`,
    desde,
    hasta,
    anterior: { desde: new Date(desde - dias * 86400000), hasta: new Date(desde - 86400000) }
  };
}

/** Resuelve periodo a partir de query: ?periodoTipo=&periodo= o ?desde=&hasta= */
export function periodoDesdeQuery(q) {
  if (q.desde && q.hasta) return resolverRango(q.desde, q.hasta);
  return resolverPeriodo(q.periodoTipo || 'MENSUAL', q.periodo);
}

