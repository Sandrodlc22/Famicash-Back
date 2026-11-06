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

export const obtenerMovimientoPorId = async (id) => {
  let numId;
  try {
    numId = BigInt(id);
  } catch {
    throw new AppError('ID de movimiento inválido.', 400);
  }

  const item = await prisma.movimiento.findUnique({
    where: { id: numId },
    include: {
      categoria: true,
      cuenta: true
    }
  });

  if (!item) {
    throw new AppError('Movimiento no encontrado.', 404);
  }

  return formatMovimiento(item);
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

export const actualizarMovimiento = async (id, data) => {
  let numId;
  try {
    numId = BigInt(id);
  } catch {
    throw new AppError('ID de movimiento inválido.', 400);
  }

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.movimiento.findUnique({
      where: { id: numId },
      include: { cuenta: true }
    });

    if (!existing) throw new AppError('Movimiento no encontrado.', 404);

    const oldMonto = Number(existing.monto);
    const oldTipo = existing.tipo;
    const oldCuentaId = existing.cuentaId;

    const newCuentaId = data.cuenta_id || data.cuentaId ? parseInt(data.cuenta_id || data.cuentaId, 10) : oldCuentaId;
    const newCatId = data.categoria_id || data.categoriaId ? parseInt(data.categoria_id || data.categoriaId, 10) : existing.categoriaId;
    const newMonto = data.monto !== undefined ? parseFloat(data.monto) : oldMonto;
    const newTipo = data.tipo ? data.tipo.toUpperCase() : oldTipo;

    if (isNaN(newMonto) || newMonto <= 0) {
      throw new AppError('El monto debe ser un número positivo mayor a 0.', 400);
    }
    if (!['GASTO', 'INGRESO'].includes(newTipo)) {
      throw new AppError('El tipo debe ser GASTO o INGRESO.', 400);
    }

    const targetCuenta = await tx.cuentaBancaria.findUnique({ where: { id: newCuentaId } });
    if (!targetCuenta) throw new AppError('La cuenta bancaria seleccionada no existe.', 404);

    if (newCatId !== existing.categoriaId) {
      const targetCat = await tx.categoria.findUnique({ where: { id: newCatId } });
      if (!targetCat) throw new AppError('La categoría seleccionada no existe.', 404);
    }

    // Reajustar saldos contables
    if (newCuentaId === oldCuentaId) {
      const saldoBase = Number(existing.cuenta?.saldoActual || 0);
      const saldoSinViejo = oldTipo === 'GASTO' ? (saldoBase + oldMonto) : (saldoBase - oldMonto);
      const saldoFinal = newTipo === 'GASTO' ? (saldoSinViejo - newMonto) : (saldoSinViejo + newMonto);

      await tx.cuentaBancaria.update({
        where: { id: oldCuentaId },
        data: { saldoActual: Math.round(saldoFinal * 100) / 100 }
      });
    } else {
      // Cambio de cuenta: restaurar en cuenta origen y aplicar en cuenta destino
      const saldoVieja = Number(existing.cuenta?.saldoActual || 0);
      const saldoViejaRestaurado = oldTipo === 'GASTO' ? (saldoVieja + oldMonto) : (saldoVieja - oldMonto);
      await tx.cuentaBancaria.update({
        where: { id: oldCuentaId },
        data: { saldoActual: Math.round(saldoViejaRestaurado * 100) / 100 }
      });

      const saldoNueva = Number(targetCuenta.saldoActual || 0);
      const saldoNuevaFinal = newTipo === 'GASTO' ? (saldoNueva - newMonto) : (saldoNueva + newMonto);
      await tx.cuentaBancaria.update({
        where: { id: newCuentaId },
        data: { saldoActual: Math.round(saldoNuevaFinal * 100) / 100 }
      });
    }

    const updateData = {
      cuentaId: newCuentaId,
      categoriaId: newCatId,
      tipo: newTipo,
      monto: newMonto
    };
    if (data.subtipo) updateData.subtipo = data.subtipo.trim();
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion.trim();
    if (data.fecha_movimiento || data.fechaMovimiento) {
      updateData.fechaMovimiento = new Date(data.fecha_movimiento || data.fechaMovimiento);
    }

    const actualizado = await tx.movimiento.update({
      where: { id: numId },
      data: updateData,
      include: {
        categoria: true,
        cuenta: true
      }
    });

    const cuentaRefrescada = await tx.cuentaBancaria.findUnique({ where: { id: newCuentaId } });

    return {
      movimiento: formatMovimiento(actualizado),
      cuentaActualizada: formatCuenta(cuentaRefrescada)
    };
  });
};

export const eliminarMovimiento = async (id) => {
  let numId;
  try {
    numId = BigInt(id);
  } catch {
    throw new AppError('ID de movimiento inválido.', 400);
  }

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
