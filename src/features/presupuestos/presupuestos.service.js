import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';

export function formatPresupuesto(p) {
  if (!p) return null;
  return {
    id: p.id,
    cuenta_id: p.cuentaId,
    cuentaId: p.cuentaId,
    cuenta_nombre: p.cuenta?.nombre || null,
    periodo_mes: p.periodoMes,
    periodoMes: p.periodoMes,
    limite_asignado: Number(p.limiteAsignado),
    limiteAsignado: Number(p.limiteAsignado),
    saldo_anterior: p.saldoAnterior !== null ? Number(p.saldoAnterior) : 0,
    saldoAnterior: p.saldoAnterior !== null ? Number(p.saldoAnterior) : 0,
    total_disponible: Number(p.totalDisponible),
    totalDisponible: Number(p.totalDisponible),
    created_at: p.createdAt,
    createdAt: p.createdAt
  };
}

export const listarPresupuestos = async ({ cuentaId = null } = {}) => {
  const where = {};
  if (cuentaId) {
    where.cuentaId = parseInt(cuentaId, 10);
  }

  const items = await prisma.presupuesto.findMany({
    where,
    include: {
      cuenta: true
    },
    orderBy: {
      periodoMes: 'desc'
    }
  });

  return items.map(formatPresupuesto);
};

export const obtenerPresupuestoPorId = async (id) => {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new AppError('ID de presupuesto inválido.', 400);

  const item = await prisma.presupuesto.findUnique({
    where: { id: numId },
    include: { cuenta: true }
  });

  if (!item) {
    throw new AppError('Presupuesto no encontrado.', 404);
  }

  return formatPresupuesto(item);
};

export const crearPresupuesto = async (data) => {
  const { cuenta_id, cuentaId, periodo_mes, periodoMes, limite_asignado, limiteAsignado, saldo_anterior, saldoAnterior } = data;

  const numCuentaId = parseInt(cuenta_id || cuentaId, 10);
  const limiteNum = parseFloat(limite_asignado || limiteAsignado);

  if (isNaN(numCuentaId)) throw new AppError('Debe especificar una cuenta bancaria válida.', 400);
  if (isNaN(limiteNum) || limiteNum <= 0) throw new AppError('El límite asignado debe ser un número positivo mayor a 0.', 400);

  // Verificar cuenta
  const cuenta = await prisma.cuentaBancaria.findUnique({ where: { id: numCuentaId } });
  if (!cuenta) throw new AppError('La cuenta bancaria no existe.', 404);

  const fechaPeriodo = periodo_mes || periodoMes ? new Date(periodo_mes || periodoMes) : new Date();
  const saldoAntNum = parseFloat(saldo_anterior || saldoAnterior || 0) || 0;
  const totalDisp = limiteNum + saldoAntNum;

  const nuevo = await prisma.presupuesto.create({
    data: {
      cuentaId: numCuentaId,
      periodoMes: fechaPeriodo,
      limiteAsignado: limiteNum,
      saldoAnterior: saldoAntNum,
      totalDisponible: totalDisp
    },
    include: {
      cuenta: true
    }
  });

  return formatPresupuesto(nuevo);
};

export const actualizarPresupuesto = async (id, data) => {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new AppError('ID de presupuesto inválido.', 400);

  const existing = await prisma.presupuesto.findUnique({ where: { id: numId } });
  if (!existing) throw new AppError('Presupuesto no encontrado.', 404);

  const updateData = {};

  const numCuentaId = data.cuenta_id || data.cuentaId;
  if (numCuentaId) {
    const cuenta = await prisma.cuentaBancaria.findUnique({ where: { id: parseInt(numCuentaId, 10) } });
    if (!cuenta) throw new AppError('La cuenta bancaria no existe.', 404);
    updateData.cuentaId = parseInt(numCuentaId, 10);
  }

  if (data.periodo_mes || data.periodoMes) {
    updateData.periodoMes = new Date(data.periodo_mes || data.periodoMes);
  }

  let limite = existing.limiteAsignado;
  if (data.limite_asignado !== undefined || data.limiteAsignado !== undefined) {
    const parsed = parseFloat(data.limite_asignado ?? data.limiteAsignado);
    if (isNaN(parsed) || parsed <= 0) throw new AppError('El límite asignado debe ser positivo.', 400);
    limite = parsed;
    updateData.limiteAsignado = parsed;
  }

  let saldoAnt = existing.saldoAnterior;
  if (data.saldo_anterior !== undefined || data.saldoAnterior !== undefined) {
    saldoAnt = parseFloat(data.saldo_anterior ?? data.saldoAnterior) || 0;
    updateData.saldoAnterior = saldoAnt;
  }

  updateData.totalDisponible = Number(limite) + Number(saldoAnt || 0);

  const actualizado = await prisma.presupuesto.update({
    where: { id: numId },
    data: updateData,
    include: { cuenta: true }
  });

  return formatPresupuesto(actualizado);
};

export const eliminarPresupuesto = async (id) => {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new AppError('ID de presupuesto inválido.', 400);

  const existing = await prisma.presupuesto.findUnique({ where: { id: numId } });
  if (!existing) throw new AppError('Presupuesto no encontrado.', 404);

  await prisma.presupuesto.delete({
    where: { id: numId }
  });

  return true;
};
