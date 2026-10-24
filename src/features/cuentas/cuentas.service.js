import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';

export function formatCuenta(c) {
  if (!c) return null;
  const saldoNum = c.saldoActual !== null && c.saldoActual !== undefined ? Number(c.saldoActual) : 0;
  return {
    id: c.id,
    usuario_id: c.usuarioId,
    usuarioId: c.usuarioId,
    nombre: c.nombre,
    tipo: c.tipo,
    saldo_actual: saldoNum,
    saldoActual: saldoNum,
    umbral_alerta_pct: c.umbralAlertaPct ?? 80,
    umbralAlertaPct: c.umbralAlertaPct ?? 80,
    alerta_activa: c.alertaActiva ?? false,
    alertaActiva: c.alertaActiva ?? false,
    created_at: c.createdAt,
    createdAt: c.createdAt
  };
}

export const listarCuentas = async (usuarioId = null) => {
  const where = {};
  if (usuarioId) {
    where.usuarioId = parseInt(usuarioId, 10);
  }

  const cuentas = await prisma.cuentaBancaria.findMany({
    where,
    orderBy: { id: 'asc' }
  });

  return cuentas.map(formatCuenta);
};

export const obtenerCuentaPorId = async (id) => {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new AppError('ID de cuenta bancaria inválido.', 400);

  const cuenta = await prisma.cuentaBancaria.findUnique({
    where: { id: numId }
  });

  if (!cuenta) {
    throw new AppError('Cuenta bancaria no encontrada.', 404);
  }

  return formatCuenta(cuenta);
};

export const crearCuenta = async (data, usuarioId = null) => {
  const { nombre, tipo, saldo_actual, saldoActual, umbral_alerta_pct, umbralAlertaPct } = data;

  if (!nombre?.trim()) throw new AppError('El nombre de la cuenta es obligatorio.', 400);

  // Determinar el ID del usuario propietario de la cuenta
  let finalUsuarioId = usuarioId || data.usuario_id || data.usuarioId;
  if (!finalUsuarioId) {
    const primerUsuario = await prisma.usuario.findFirst({ select: { id: true } });
    if (!primerUsuario) throw new AppError('No existen usuarios para asociar la cuenta.', 400);
    finalUsuarioId = primerUsuario.id;
  }

  const saldoInicial = saldo_actual !== undefined ? parseFloat(saldo_actual) : (saldoActual !== undefined ? parseFloat(saldoActual) : 0);
  const umbral = umbral_alerta_pct !== undefined ? parseInt(umbral_alerta_pct, 10) : (umbralAlertaPct !== undefined ? parseInt(umbralAlertaPct, 10) : 80);

  const nueva = await prisma.cuentaBancaria.create({
    data: {
      usuarioId: parseInt(finalUsuarioId, 10),
      nombre: nombre.trim(),
      tipo: tipo?.trim() || 'Ahorros',
      saldoActual: isNaN(saldoInicial) ? 0 : saldoInicial,
      umbralAlertaPct: isNaN(umbral) ? 80 : umbral,
      alertaActiva: false
    }
  });

  return formatCuenta(nueva);
};

export const actualizarCuenta = async (id, data) => {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new AppError('ID de cuenta bancaria inválido.', 400);

  const existing = await prisma.cuentaBancaria.findUnique({ where: { id: numId } });
  if (!existing) throw new AppError('Cuenta bancaria no encontrada.', 404);

  const updateData = {};
  if (data.nombre) updateData.nombre = data.nombre.trim();
  if (data.tipo) updateData.tipo = data.tipo.trim();

  const saldo = data.saldo_actual !== undefined ? data.saldo_actual : data.saldoActual;
  if (saldo !== undefined && saldo !== null) {
    const parsedSaldo = parseFloat(saldo);
    if (!isNaN(parsedSaldo)) updateData.saldoActual = parsedSaldo;
  }

  const umbral = data.umbral_alerta_pct !== undefined ? data.umbral_alerta_pct : data.umbralAlertaPct;
  if (umbral !== undefined && umbral !== null) {
    const parsedUmbral = parseInt(umbral, 10);
    if (!isNaN(parsedUmbral)) updateData.umbralAlertaPct = parsedUmbral;
  }

  if (data.alerta_activa !== undefined) updateData.alertaActiva = Boolean(data.alerta_activa);
  if (data.alertaActiva !== undefined) updateData.alertaActiva = Boolean(data.alertaActiva);

  const actualizada = await prisma.cuentaBancaria.update({
    where: { id: numId },
    data: updateData
  });

  return formatCuenta(actualizada);
};

export const eliminarCuenta = async (id) => {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new AppError('ID de cuenta bancaria inválido.', 400);

  const existing = await prisma.cuentaBancaria.findUnique({ where: { id: numId } });
  if (!existing) throw new AppError('Cuenta bancaria no encontrada.', 404);

  await prisma.cuentaBancaria.delete({
    where: { id: numId }
  });

  return true;
};
