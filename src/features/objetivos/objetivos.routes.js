// ============================================================
// Objetivos / Metas de Ahorro con Auditoría Real en Base de Datos:
//  - Permite crear cualquier tipo de meta personalizado.
//  - Devuelve los usuarios reales de la tabla `usuarios` (Anthony, Vanessa, etc.).
//  - Cada abono o retiro en una meta genera un registro de auditoría en la tabla
//    `transacciones` (con usuario, fecha, medio de pago, monto y nota) y se puede
//    consultar en el historial de cada meta.
// ============================================================
import { Router } from 'express';
import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';
import { parseFecha, formatFecha } from '../../lib/utils/fechas.js';
import { toInt, num, round2 } from '../../lib/utils/filtros.js';

const router = Router();
const PERSONAS = ['FAMILIA', 'ANTHONY', 'VANESSA', 'LARA'];

async function datos(body, parcial = false) {
  const d = {};
  const b = body || {};
  if (!parcial || b.nombre !== undefined) {
    d.nombre = String(b.nombre || '').trim();
    if (!d.nombre) throw new AppError('El nombre de la meta es obligatorio.', 400);
  }
  if (!parcial || b.tipo !== undefined) {
    d.tipo = String(b.tipo || '').trim() || 'General';
  }
  if (!parcial || b.montoMeta !== undefined) {
    d.montoMeta = round2(Number(b.montoMeta));
    if (!Number.isFinite(d.montoMeta) || d.montoMeta <= 0) {
      throw new AppError('El monto de la meta debe ser mayor a 0.', 400);
    }
  }
  if (b.montoInicial !== undefined) {
    d.montoInicial = round2(Number(b.montoInicial) || 0);
    if (d.montoInicial < 0) throw new AppError('El monto inicial no puede ser negativo.', 400);
  }
  if (b.fechaObjetivo !== undefined) {
    d.fechaObjetivo = b.fechaObjetivo ? parseFecha(b.fechaObjetivo, 'fecha objetivo') : null;
  }
  if (b.responsable !== undefined) {
    d.responsable = PERSONAS.includes(b.responsable) ? b.responsable : 'FAMILIA';
  }
  if (b.subcategoriaAhorroId !== undefined) {
    if (b.subcategoriaAhorroId) {
      const sub = await prisma.subcategoria.findUnique({
        where: { id: toInt(b.subcategoriaAhorroId, 'subcategoriaAhorroId') },
        include: { categoria: true }
      });
      if (!sub || sub.categoria.tipo !== 'AHORRO') {
        throw new AppError('Debe vincularse a una subcategoría de ahorro.', 400);
      }
      d.subcategoriaAhorroId = sub.id;
    } else {
      d.subcategoriaAhorroId = null;
    }
  }
  if (b.activo !== undefined) d.activo = Boolean(b.activo);
  return d;
}

router.get('/', async (req, res) => {
  const [objetivos, usuariosDB, txsAuditoria] = await Promise.all([
    prisma.objetivoAhorro.findMany({
      where: req.query.incluirInactivos === 'true' ? {} : { activo: true },
      include: { subcategoriaAhorro: true },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.usuario.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, email: true, persona: true },
      orderBy: { id: 'asc' }
    }),
    prisma.transaccion.findMany({
      where: {
        OR: [
          { observaciones: { startsWith: '[META:' } },
          { tipo: 'AHORRO' }
        ]
      },
      include: {
        creadoPor: { select: { id: true, nombre: true, email: true } },
        medioPago: { select: { id: true, nombre: true } }
      },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
      take: 250
    })
  ]);

  const subIds = [...new Set(objetivos.map((o) => o.subcategoriaAhorroId).filter(Boolean))];
  const aportes = subIds.length
    ? await prisma.transaccion.groupBy({
        by: ['subcategoriaId'],
        where: {
          subcategoriaId: { in: subIds },
          tipo: 'AHORRO',
          NOT: { observaciones: { startsWith: '[META:' } }
        },
        _sum: { monto: true }
      })
    : [];
  const mapAportes = new Map(aportes.map((a) => [a.subcategoriaId, num(a._sum.monto)]));

  let totalAcumulado = 0;
  let totalMeta = 0;

  const items = objetivos.map((o) => {
    const prefijoMeta = `[META:${o.id}]`;
    // Historial de auditoría de esta meta (abonos/retiros directos + movimientos vinculados)
    const historialMeta = txsAuditoria
      .filter((tx) => {
        const obs = tx.observaciones || '';
        if (obs.startsWith(prefijoMeta)) return true;
        if (o.subcategoriaAhorroId && tx.subcategoriaId === o.subcategoriaAhorroId && !obs.startsWith('[META:')) {
          return true;
        }
        return false;
      })
      .slice(0, 15)
      .map((tx) => {
        const obs = tx.observaciones || '';
        const esRetiro = obs.includes('[RETIRO]');
        const notaLimpia = obs
          .replace(/^\[META:\d+\]\s*/, '')
          .replace(/^\[(ABONO|RETIRO)\]\s*/, '')
          .trim();
        return {
          id: tx.id,
          fecha: formatFecha(tx.fecha),
          creadoEn: tx.creadoEn,
          monto: num(tx.monto),
          accion: esRetiro ? 'RETIRO' : 'ABONO',
          usuario: tx.creadoPor?.nombre || 'Familiar',
          medioPago: tx.medioPago?.nombre || tx.medioPagoNombre || 'Efectivo / Cuenta',
          nota: notaLimpia || tx.detalleNombre || 'Aporte a meta de ahorro'
        };
      });

    const meta = num(o.montoMeta);
    const acumulado = round2(
      num(o.montoInicial) + (o.subcategoriaAhorroId ? mapAportes.get(o.subcategoriaAhorroId) || 0 : 0)
    );
    totalAcumulado += acumulado;
    totalMeta += meta;

    return {
      id: o.id,
      nombre: o.nombre,
      tipo: o.tipo,
      montoMeta: meta,
      montoInicial: num(o.montoInicial),
      acumulado,
      pct: meta ? round2(Math.min((acumulado / meta) * 100, 999)) : 0,
      faltante: round2(Math.max(meta - acumulado, 0)),
      fechaObjetivo: o.fechaObjetivo ? formatFecha(o.fechaObjetivo) : null,
      responsable: o.responsable,
      subcategoriaAhorroId: o.subcategoriaAhorroId,
      subcategoriaAhorro: o.subcategoriaAhorro?.codigo || null,
      activo: o.activo,
      historial: historialMeta
    };
  });

  res.json({
    items,
    totales: {
      acumulado: round2(totalAcumulado),
      meta: round2(totalMeta),
      pct: totalMeta ? round2((totalAcumulado / totalMeta) * 100) : 0
    },
    usuarios: usuariosDB,
    tipos: [
      ...new Set([
        'Fondo de emergencia',
        'Vacaciones',
        'Educación',
        'Vivienda',
        'Compra / Proyecto',
        ...objetivos.map((o) => o.tipo).filter(Boolean)
      ])
    ]
  });
});

router.post('/', async (req, res) => {
  res.status(201).json(await prisma.objetivoAhorro.create({ data: await datos(req.body) }));
});

router.patch('/:id', async (req, res) => {
  res.json(
    await prisma.objetivoAhorro.update({
      where: { id: toInt(req.params.id) },
      data: await datos(req.body, true)
    })
  );
});

/**
 * POST /api/objetivos/:id/movimiento
 * Registra un ABONO o RETIRO en la meta y crea automáticamente una fila de
 * AUDITORÍA en la tabla `transacciones` con el usuario que hizo la operación,
 * fecha, medio de pago y observación.
 */
router.post('/:id/movimiento', async (req, res) => {
  const id = toInt(req.params.id);
  const { monto, modo = 'sumar', medioPagoId, nota, fecha } = req.body || {};

  const montoVal = round2(Number(monto));
  if (!Number.isFinite(montoVal) || montoVal <= 0) {
    throw new AppError('Ingresa un monto válido mayor a S/ 0.00.', 400);
  }

  const obj = await prisma.objetivoAhorro.findUnique({ where: { id } });
  if (!obj) throw new AppError('Meta de ahorro no encontrada.', 404);

  const esRetiro = modo === 'restar';
  const delta = esRetiro ? -montoVal : montoVal;
  const nuevoInicial = Math.max(0, round2(num(obj.montoInicial) + delta));

  // Buscar la categoría y subcategoría de AHORRO para registrar la transacción de auditoría
  let catAhorro = await prisma.categoria.findFirst({
    where: { tipo: 'AHORRO', activa: true },
    include: { subcategorias: { where: { activa: true }, orderBy: { orden: 'asc' } } }
  });
  if (!catAhorro) {
    catAhorro = await prisma.categoria.findFirst({
      include: { subcategorias: { orderBy: { orden: 'asc' } } }
    });
  }

  const subIdAuditoria =
    obj.subcategoriaAhorroId ||
    catAhorro?.subcategorias?.find((s) => s.persona === obj.responsable)?.id ||
    catAhorro?.subcategorias?.[0]?.id;

  const subAuditoria = subIdAuditoria
    ? await prisma.subcategoria.findUnique({
        where: { id: subIdAuditoria },
        include: { categoria: true }
      })
    : null;

  const mp = medioPagoId
    ? await prisma.medioPago.findUnique({ where: { id: toInt(medioPagoId) } })
    : await prisma.medioPago.findFirst({ where: { activo: true }, orderBy: { orden: 'asc' } });

  const fechaObj = fecha ? parseFecha(fecha, 'fecha') : new Date();
  const etiquetaAccion = esRetiro ? '[RETIRO]' : '[ABONO]';
  const textoNota = String(nota || '').trim() || (esRetiro ? `Retiro de meta: ${obj.nombre}` : `Abono a meta: ${obj.nombre}`);
  const obsAuditoria = `[META:${obj.id}] ${etiquetaAccion} ${textoNota}`;

  const [actualizado, txCreada] = await prisma.$transaction([
    prisma.objetivoAhorro.update({
      where: { id: obj.id },
      data: { montoInicial: nuevoInicial }
    }),
    ...(subAuditoria
      ? [
          prisma.transaccion.create({
            data: {
              fecha: fechaObj,
              tipo: 'AHORRO',
              categoriaId: subAuditoria.categoriaId,
              subcategoriaId: subAuditoria.id,
              detalleId: null,
              medioPagoId: mp?.id || null,
              monto: montoVal,
              persona: obj.responsable || 'FAMILIA',
              clase: 'Ahorro',
              observaciones: obsAuditoria,
              categoriaNombre: subAuditoria.categoria.codigo,
              subcategoriaNombre: subAuditoria.codigo,
              detalleNombre: obj.nombre,
              medioPagoNombre: mp?.nombre || null,
              creadoPorId: req.user?.id || null
            }
          })
        ]
      : [])
  ]);

  res.status(201).json({
    ok: true,
    objetivo: actualizado,
    auditoria: txCreada || null
  });
});

router.delete('/:id', async (req, res) => {
  await prisma.objetivoAhorro.delete({ where: { id: toInt(req.params.id) } });
  res.json({ ok: true });
});

export default router;
