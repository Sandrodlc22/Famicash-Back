import { prisma } from '../../lib/prisma/prisma.js';
import { listarCuentas } from '../cuentas/cuentas.service.js';
import { listarMovimientos } from '../movimientos/movimientos.service.js';

export const generarResumenFinanciero = async (usuarioId = null) => {
  // 1. Obtener cuentas y calcular saldo total
  const cuentas = await listarCuentas(usuarioId);
  const saldoTotal = cuentas.reduce((acc, c) => acc + (parseFloat(c.saldo_actual) || 0), 0);

  // 2. Obtener movimientos recientes
  const movimientos = await listarMovimientos({ limite: 100 });

  // 3. Obtener presupuesto mensual configurado en la base de datos (o valor por defecto 5000.00)
  const ahora = new Date();
  const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const presupuestoDb = await prisma.presupuesto.findFirst({
    where: {
      periodoMes: {
        gte: primerDiaMes
      }
    },
    orderBy: { id: 'desc' }
  });

  const presupuestoMensual = presupuestoDb ? Number(presupuestoDb.limiteAsignado) : 5000.00;

  // 4. Calcular totales y desglose por categorías (excluyendo transferencias internas entre cuentas)
  let totalGastos = 0;
  let totalIngresos = 0;
  const desgloseCategorias = {};

  movimientos.forEach((m) => {
    const isTransfer =
      m.tipo === 'TRANSFERENCIA' ||
      m.subtipo === 'Transferencia' ||
      m.categoria_nombre === 'Transferencia';

    if (isTransfer) return;

    const monto = parseFloat(m.monto || 0);
    if (m.tipo === 'GASTO') {
      totalGastos += monto;
      const cat = m.categoria_nombre || 'Otros';
      desgloseCategorias[cat] = (desgloseCategorias[cat] || 0) + monto;
    } else if (m.tipo === 'INGRESO') {
      totalIngresos += monto;
    }
  });

  // Redondear porcentajes y cifras
  const gastosRedondeados = Math.round(totalGastos * 100) / 100;
  const ingresosRedondeados = Math.round(totalIngresos * 100) / 100;
  const porcentajePresupuestoGastado = presupuestoMensual > 0
    ? Math.min(100, Math.round((gastosRedondeados / presupuestoMensual) * 100))
    : 0;

  return {
    saldoTotal: Math.round(saldoTotal * 100) / 100,
    totalGastos: gastosRedondeados,
    totalIngresos: ingresosRedondeados,
    presupuestoMensual,
    porcentajePresupuestoGastado,
    desgloseCategorias,
    cuentasResumen: cuentas,
    movimientosRecientes: movimientos.slice(0, 15)
  };
};
