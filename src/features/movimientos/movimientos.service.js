import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';
import { formatCuenta } from '../cuentas/cuentas.service.js';

export function formatMovimiento(m) {
  if (!m) return null;
  const montoNum = m.monto !== null && m.monto !== undefined ? Number(m.monto) : 0;
  return {
    id: Number(m.id),
    cuenta_id: m.cuentaId,
    cuentaId: m.cuentaId,
    categoria_id: m.categoriaId,
    categoriaId: m.categoriaId,
    tipo: m.tipo,
    monto: montoNum,
    subtipo: m.subtipo || 'Cotidiano',
    descripcion: m.descripcion || '',
    fecha_movimiento: m.fechaMovimiento,
    fechaMovimiento: m.fechaMovimiento,
    categoria_nombre: m.categoria?.nombre || 'General',
    categoria_icono: m.categoria?.icono || 'more-horizontal',
    cuenta_nombre: m.cuenta?.nombre || 'Cuenta',
    created_at: m.createdAt,
    createdAt: m.createdAt
  };
}

export const listarMovimientos = async ({ limite = 50, cuentaId = null, tipo = null } = {}) => {
  const where = {};
  if (cuentaId) {
    where.cuentaId = parseInt(cuentaId, 10);
  }
  if (tipo) {
    const cleanTipo = tipo.toUpperCase();
    if (['GASTO', 'INGRESO'].includes(cleanTipo)) {
      where.tipo = cleanTipo;
    }
  }

  const items = await prisma.movimiento.findMany({
    where,
    include: {
      categoria: true,
      cuenta: true
    },
    orderBy: {
      fechaMovimiento: 'desc'
    },
    take: parseInt(limite, 10) || 50
  });

  return items.map(formatMovimiento);
};

export const crearMovimiento = async ({
  cuenta_id,
  cuentaId,
  categoria_id,
  categoriaId,
  tipo,
  monto,
  subtipo = 'Cotidiano',
  descripcion = '',
  fecha_movimiento = null,
  fechaMovimiento = null
}) => {
  const numCuentaId = parseInt(cuenta_id || cuentaId, 10);
  const numCatId = parseInt(categoria_id || categoriaId, 10);
  const montoNum = parseFloat(monto);

  if (isNaN(numCuentaId)) throw new AppError('Debe seleccionar una cuenta bancaria válida.', 400);
  if (isNaN(numCatId)) throw new AppError('Debe seleccionar una categoría válida.', 400);
  if (isNaN(montoNum) || montoNum <= 0) throw new AppError('El monto debe ser un número positivo mayor a 0.', 400);

  const cleanTipo = (tipo || 'GASTO').toUpperCase();
  if (!['GASTO', 'INGRESO'].includes(cleanTipo)) {
    throw new AppError('El tipo debe ser GASTO o INGRESO.', 400);
  }

  const fechaFinal = fecha_movimiento || fechaMovimiento ? new Date(fecha_movimiento || fechaMovimiento) : new Date();

  // Transacción atómica: crear movimiento y actualizar saldo de la cuenta
  const resultado = await prisma.$transaction(async (tx) => {
    // 1. Verificar cuenta
    const cuenta = await tx.cuentaBancaria.findUnique({ where: { id: numCuentaId } });
    if (!cuenta) throw new AppError('La cuenta bancaria seleccionada no existe.', 404);

    // 2. Verificar categoría
    const categoria = await tx.categoria.findUnique({ where: { id: numCatId } });
    if (!categoria) throw new AppError('La categoría seleccionada no existe.', 404);

    // 3. Crear el movimiento
    const nuevo = await tx.movimiento.create({
      data: {
        cuentaId: numCuentaId,
        categoriaId: numCatId,
        tipo: cleanTipo,
        monto: montoNum,
        subtipo: subtipo?.trim() || 'Cotidiano',
        descripcion: descripcion?.trim() || '',
        fechaMovimiento: fechaFinal
      },
      include: {
        categoria: true,
        cuenta: true
      }
    });

    // 4. Calcular y actualizar el saldo de la cuenta
    const saldoActualNum = cuenta.saldoActual !== null ? Number(cuenta.saldoActual) : 0;
    const nuevoSaldo = cleanTipo === 'GASTO'
      ? Math.round((saldoActualNum - montoNum) * 100) / 100
      : Math.round((saldoActualNum + montoNum) * 100) / 100;

    const cuentaActualizada = await tx.cuentaBancaria.update({
      where: { id: numCuentaId },
      data: { saldoActual: nuevoSaldo }
    });

    return {
      movimiento: formatMovimiento(nuevo),
      cuentaActualizada: formatCuenta(cuentaActualizada)
    };
  });

  return resultado;
};

export const eliminarMovimiento = async (id) => {
  const numId = BigInt(id);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.movimiento.findUnique({
      where: { id: numId },
      include: { cuenta: true }
    });

    if (!existing) throw new AppError('Movimiento no encontrado.', 404);

    // Revertir el saldo en la cuenta correspondiente
    const cuenta = existing.cuenta;
    if (cuenta) {
      const saldoActualNum = cuenta.saldoActual !== null ? Number(cuenta.saldoActual) : 0;
      const montoNum = Number(existing.monto);

      // Si fue GASTO, al eliminarlo se le devuelve el dinero a la cuenta
      // Si fue INGRESO, al eliminarlo se le resta el dinero a la cuenta
      const nuevoSaldo = existing.tipo === 'GASTO'
        ? Math.round((saldoActualNum + montoNum) * 100) / 100
        : Math.round((saldoActualNum - montoNum) * 100) / 100;

      await tx.cuentaBancaria.update({
        where: { id: cuenta.id },
        data: { saldoActual: nuevoSaldo }
      });
    }

    await tx.movimiento.delete({
      where: { id: numId }
    });
  });

  return true;
};
