import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { TAXONOMIA, MEDIOS_PAGO, FAVORITOS_INICIALES } from './taxonomia.js';

const prisma = new PrismaClient();

// El dataset demo BORRA transacciones, presupuestos y objetivos.
// Solo se ejecuta de forma explícita: `npm run db:seed:demo` o SEED_DEMO=true.
const RUN_DEMO = process.argv.includes('--demo') || process.env.SEED_DEMO === 'true';

async function seedTaxonomia() {
  // Solo crea lo que falta; nunca modifica registros existentes (update: {}).
  for (const [ci, cat] of TAXONOMIA.entries()) {
    const categoria = await prisma.categoria.upsert({
      where: { codigo: cat.codigo },
      update: {},
      create: { codigo: cat.codigo, tipo: cat.tipo, persona: cat.persona, orden: ci + 1 }
    });
    for (const [si, sub] of cat.subcategorias.entries()) {
      const subcategoria = await prisma.subcategoria.upsert({
        where: { categoriaId_codigo: { categoriaId: categoria.id, codigo: sub.codigo } },
        update: {},
        create: {
          categoriaId: categoria.id,
          codigo: sub.codigo,
          persona: sub.persona || null,
          orden: si + 1
        }
      });
      for (const [di, nombre] of sub.detalles.entries()) {
        const existe = await prisma.detalle.findFirst({ where: { subcategoriaId: subcategoria.id, nombre } });
        if (!existe) {
          await prisma.detalle.create({ data: { subcategoriaId: subcategoria.id, nombre, orden: di + 1 } });
        }
      }
    }
  }
  console.log('✅ Taxonomía cargada (6 categorías, 27 subcategorías y todos sus detalles).');
}

async function seedMediosPago() {
  for (const [i, m] of MEDIOS_PAGO.entries()) {
    await prisma.medioPago.upsert({
      where: { nombre: m.nombre },
      update: {},
      create: { ...m, orden: i + 1 }
    });
  }
  console.log('✅ Medios de pago cargados.');
}

async function seedUsuarios() {
  const passwordHash = await bcrypt.hash('famicash123', 10);
  const usuarios = [
    { nombre: 'Anthony', email: 'anthony@famicash.pe', persona: 'ANTHONY' },
    { nombre: 'Vanessa', email: 'vanessa@famicash.pe', persona: 'VANESSA' }
  ];
  for (const u of usuarios) {
    const user = await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash }
    });
    const tieneFavs = await prisma.favorito.count({ where: { usuarioId: user.id } });
    if (!tieneFavs) {
      const codigos = FAVORITOS_INICIALES[u.persona] || [];
      for (const [i, codigo] of codigos.entries()) {
        const sub = await prisma.subcategoria.findFirst({ where: { codigo } });
        if (sub) {
          await prisma.favorito.create({ data: { usuarioId: user.id, subcategoriaId: sub.id, orden: i + 1 } });
        }
      }
    }
  }
  console.log('✅ Usuarios listos: anthony@famicash.pe / vanessa@famicash.pe (clave: famicash123)');
}

// ============================================================
// Seed de los últimos 4 meses completos con movimientos realistas,
// presupuestos mensuales y objetivos de ahorro familiares
// ============================================================
async function seedUltimos4Meses() {
  // Limpiamos transacciones, presupuestos y objetivos previos para dejar el dataset limpio de 4 meses
  await prisma.transaccion.deleteMany({});
  await prisma.presupuesto.deleteMany({});
  await prisma.objetivoAhorro.deleteMany({});

  const subs = await prisma.subcategoria.findMany({ include: { categoria: true, detalles: true } });
  const medios = await prisma.medioPago.findMany();
  const anthony = await prisma.usuario.findUnique({ where: { email: 'anthony@famicash.pe' } });
  const vanessa = await prisma.usuario.findUnique({ where: { email: 'vanessa@famicash.pe' } });

  const bySub = (codigo) => subs.find((s) => s.codigo === codigo);
  const byMedio = (nombre) => medios.find((m) => m.nombre === nombre) || medios[0];

  // Plantilla mensual realista para los últimos 4 meses
  // [codigoSub, idxDetalle, montoBase, variacion, repeticionesMes, clase, medioPreferido, notaEjemplo]
  const plantilla = [
    // I. INGRESOS
    ['_1_SUELDOS', 0, 9500, 0, 1, 'Fijo', 'CUENTA BCP', 'Abono sueldo mensual Vanessa'],
    ['_1_SUELDOS', 1, 7800, 0, 1, 'Fijo', 'CUENTA BCP', 'Abono sueldo mensual Anthony'],
    ['_2_PENSION', 0, 850, 0, 1, 'Fijo', 'CUENTA BCP', 'Pensión mensual'],
    ['_4_OTROS_INGRESOS', 2, 450, 150, 1, 'Extra', 'YAPE/PLIN/TRANSFERENCIA ANTHONY', 'Ingreso extra / reembolso'],

    // II. GENERALES (HOGAR)
    ['_1_VIVIENDA', 0, 3200, 0, 1, 'Fijo', 'CUENTA BCP', 'Cuota departamento / hipoteca'],
    ['_2_MANTENIMIENTO', 0, 95, 20, 1, 'Fijo', 'YAPE/PLIN/TRANSFERENCIA ANTHONY', 'Jardinería mensual'],
    ['_2_MANTENIMIENTO', 1, 380, 15, 1, 'Fijo', 'CUENTA BCP', 'Mantenimiento edificio'],
    ['_3_SERVICIOS_BASICOS', 0, 189, 0, 1, 'Fijo', 'TC PERSONAL ANTHONY', 'Internet fibra + cable hogar'],
    ['_3_SERVICIOS_BASICOS', 1, 175, 35, 1, 'Fijo', 'CUENTA BCP', 'Recibo de Luz del mes'],
    ['_3_SERVICIOS_BASICOS', 2, 58, 12, 1, 'Fijo', 'YAPE/PLIN/TRANSFERENCIA VANESSA', 'Gas natural Cálidda'],
    ['_3_SERVICIOS_BASICOS', 3, 82, 15, 1, 'Fijo', 'CUENTA BCP', 'Recibo de Agua Sedapal'],
    ['_3_SERVICIOS_BASICOS', 4, 159, 0, 1, 'Fijo', 'TC PERSONAL VANESSA', 'Planes celulares Anthony y Vanessa'],
    ['_4_TRANSPORTE', 0, 190, 40, 3, 'Cotidiano', 'TC PERSONAL ANTHONY', 'Tanqueo gasolina Primax'],
    ['_4_TRANSPORTE', 1, 110, 35, 2, 'Cotidiano', 'YAPE/PLIN/TRANSFERENCIA ANTHONY', 'Movilidad / estacionamiento'],
    ['_4_TRANSPORTE', 2, 95, 25, 2, 'Cotidiano', 'YAPE/PLIN/TRANSFERENCIA VANESSA', 'Taxi / movilidad Vanessa'],
    ['_5_PERSONAL_DE_SERVICIO', 0, 1300, 0, 1, 'Fijo', 'CUENTA BCP', 'Pago mensual Sra. Rosa'],
    ['_6_ALIMENTACION', 0, 340, 80, 4, 'Cotidiano', 'TC PERSONAL VANESSA', 'Compras semanales supermercado Wong / Plaza Vea'],
    ['_6_ALIMENTACION', 1, 85, 25, 3, 'Cotidiano', 'YAPE/PLIN/TRANSFERENCIA VANESSA', 'Frutas y verduras mercado'],
    ['_6_ALIMENTACION', 2, 48, 15, 3, 'Cotidiano', 'EFECTIVO', 'Panadería y desayunos'],
    ['_6_ALIMENTACION', 3, 185, 65, 2, 'Extra', 'TC PERSONAL ANTHONY', 'Almuerzo familiar fin de semana'],

    // III. LARA
    ['_1_CUIDADO_PERSONAL_LARA', 1, 120, 40, 1, 'Cotidiano', 'TC PERSONAL VANESSA', 'Ropa y calzado para Lara'],
    ['_2_EDUCACION_LARA', 0, 1150, 0, 1, 'Fijo', 'CUENTA BCP', 'Pensión colegio Lara'],
    ['_2_EDUCACION_LARA', 2, 75, 25, 1, 'Cotidiano', 'YAPE/PLIN/TRANSFERENCIA VANESSA', 'Materiales y útiles escolares'],
    ['_3_TALLERES_LARA', 0, 260, 0, 1, 'Fijo', 'YAPE/PLIN/TRANSFERENCIA VANESSA', 'Taller de natación / ballet Lara'],
    ['_4_DIVERSION_LARA', 0, 110, 40, 1, 'Extra', 'TC PERSONAL ANTHONY', 'Paseo y juegos fin de semana Lara'],
    ['_6_SALUD_LARA', 1, 95, 35, 1, 'Cotidiano', 'TC PERSONAL VANESSA', 'Vitaminas / farmacia pediátrica'],

    // IV. VANESSA
    ['_1_CUIDADO_PERSONAL_VANESSA', 1, 190, 60, 1, 'Cotidiano', 'TC PERSONAL VANESSA', 'Cuidado personal y salón Vanessa'],
    ['_2_DEPORTE_VANESSA', 0, 180, 0, 1, 'Fijo', 'TC PERSONAL VANESSA', 'Gimnasio / pilates Vanessa'],
    ['_5_SALUD_VANESSA', 1, 85, 30, 1, 'Cotidiano', 'YAPE/PLIN/TRANSFERENCIA VANESSA', 'Farmacia y suplementos Vanessa'],
    ['_7_DIVERSION_VANESSA', 0, 175, 50, 1, 'Extra', 'TC PERSONAL VANESSA', 'Cena con amigas / café'],

    // V. ANTHONY
    ['_1_CUIDADO_PERSONAL_ANTHONY', 1, 55, 10, 1, 'Cotidiano', 'YAPE/PLIN/TRANSFERENCIA ANTHONY', 'Barbería y cuidado personal Anthony'],
    ['_2_DEPORTE_ANTHONY', 0, 160, 0, 1, 'Fijo', 'TC PERSONAL ANTHONY', 'Entrenamiento y pádel / fútbol Anthony'],
    ['_5_SALUD_ANTHONY', 1, 70, 25, 1, 'Cotidiano', 'YAPE/PLIN/TRANSFERENCIA ANTHONY', 'Farmacia Anthony'],
    ['_6_DIVERSION_ANTHONY', 0, 190, 60, 1, 'Extra', 'TC PERSONAL ANTHONY', 'Reunión y parrilla amigos'],

    // VI. AHORRO
    ['_1_AHORRO_VANESSA', 0, 1000, 200, 1, 'Fijo', 'CUENTA BCP', 'Aporte mensual ahorro vacaciones (Vanessa)'],
    ['_2_AHORRO_ANTHONY', 0, 1200, 200, 1, 'Fijo', 'CUENTA BCP', 'Aporte mensual fondo de emergencia (Anthony)'],
    ['_3_AHORRO LARA', 0, 350, 0, 1, 'Fijo', 'CUENTA BCP', 'Ahorro mensual fondo universitario Lara']
  ];

  const hoy = new Date();
  const dataTx = [];
  const periodosCargados = [];

  // m = 3, 2, 1, 0 -> los últimos 4 meses (3 meses anteriores + mes actual)
  for (let m = 3; m >= 0; m--) {
    const base = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth() - m, 1));
    const anio = base.getUTCFullYear();
    const mesIndex = base.getUTCMonth();
    const periodoClave = `${anio}-${String(mesIndex + 1).padStart(2, '0')}`;
    periodosCargados.push(periodoClave);

    const diasMes = new Date(Date.UTC(anio, mesIndex + 1, 0)).getUTCDate();
    const limiteDia = m === 0 ? Math.max(5, hoy.getDate()) : diasMes;

    for (const [codigo, di, montoBase, variacion, veces, clase, nombreMedio, nota] of plantilla) {
      const sub = bySub(codigo);
      if (!sub) continue;
      const det = sub.detalles[di] || sub.detalles[0];
      const medio = byMedio(nombreMedio);

      for (let v = 0; v < veces; v++) {
        // Distribuir días de forma ordenada dentro del mes
        const paso = Math.max(1, Math.floor(limiteDia / (veces + 1)));
        const diaCalculado = Math.min(limiteDia, Math.max(1, (v + 1) * paso + ((di + m) % 3)));
        const factorVariacion = variacion > 0 ? (((m * 7 + v * 13 + di * 5) % 11) - 5) / 10 : 0;
        const montoFinal = Math.round((montoBase + variacion * factorVariacion) * 100) / 100;

        const creador =
          sub.persona === 'VANESSA' || sub.categoria.persona === 'VANESSA'
            ? vanessa?.id
            : anthony?.id;

        dataTx.push({
          fecha: new Date(Date.UTC(anio, mesIndex, diaCalculado)),
          tipo: sub.categoria.tipo,
          categoriaId: sub.categoriaId,
          subcategoriaId: sub.id,
          detalleId: det?.id || null,
          medioPagoId: medio?.id || null,
          monto: montoFinal,
          persona: sub.persona || sub.categoria.persona,
          clase,
          observaciones: veces > 1 ? `${nota} (#${v + 1})` : nota,
          categoriaNombre: sub.categoria.codigo,
          subcategoriaNombre: sub.codigo,
          detalleNombre: det?.nombre || null,
          medioPagoNombre: medio?.nombre || null,
          creadoPorId: creador || anthony?.id
        });
      }
    }
  }

  await prisma.transaccion.createMany({ data: dataTx });

  // Objetivos de ahorro vinculados a las subcategorías de VI_AHORRO
  const ahorroV = bySub('_1_AHORRO_VANESSA');
  const ahorroA = bySub('_2_AHORRO_ANTHONY');
  const ahorroL = bySub('_3_AHORRO LARA');

  await prisma.objetivoAhorro.createMany({
    data: [
      {
        nombre: 'Fondo de Emergencia Familiar',
        tipo: 'Fondo de emergencia',
        montoMeta: 25000,
        montoInicial: 8500,
        responsable: 'FAMILIA',
        subcategoriaAhorroId: ahorroA?.id,
        fechaObjetivo: new Date(Date.UTC(hoy.getFullYear() + 1, 5, 30))
      },
      {
        nombre: 'Viaje Familiar a Punta Cana',
        tipo: 'Vacaciones',
        montoMeta: 12000,
        montoInicial: 3200,
        responsable: 'VANESSA',
        subcategoriaAhorroId: ahorroV?.id,
        fechaObjetivo: new Date(Date.UTC(hoy.getFullYear() + 1, 1, 15))
      },
      {
        nombre: 'Fondo Educativo de Lara',
        tipo: 'Educación',
        montoMeta: 15000,
        montoInicial: 4000,
        responsable: 'LARA',
        subcategoriaAhorroId: ahorroL?.id,
        fechaObjetivo: new Date(Date.UTC(hoy.getFullYear() + 1, 11, 1))
      }
    ]
  });

  // Presupuestos mensuales para los 4 meses cargados
  const catsGasto = await prisma.categoria.findMany({ where: { tipo: 'GASTO' } });
  const topesPorCategoria = {
    II_GENERALES: 9200,
    III_LARA: 1850,
    IV_VANESSA: 850,
    V_ANTHONY: 650
  };

  const dataPresupuestos = [];
  for (const periodo of periodosCargados) {
    for (const c of catsGasto) {
      dataPresupuestos.push({
        periodoTipo: 'MENSUAL',
        periodo,
        categoriaId: c.id,
        subcategoriaId: null,
        monto: topesPorCategoria[c.codigo] || 600
      });
    }
  }
  await prisma.presupuesto.createMany({ data: dataPresupuestos });

  console.log(
    `✅ Dataset de los últimos 4 meses (${periodosCargados.join(', ')}) insertado: ${dataTx.length} movimientos, ${dataPresupuestos.length} presupuestos y 3 metas de ahorro.`
  );
}

async function main() {
  console.log(`🌱 Ejecutando Seed de FamiCash (${RUN_DEMO ? 'base + DEMO 4 meses' : 'solo datos base, no destructivo'})...`);
  await seedTaxonomia();
  await seedMediosPago();
  await seedUsuarios();
  // Demo: forzada con --demo, o automática si la BD aún no tiene movimientos (no borra nada real)
  const totalTx = await prisma.transaccion.count();
  if (RUN_DEMO || totalTx === 0) {
    if (!RUN_DEMO) console.log('ℹ️  BD sin movimientos: cargando dataset demo inicial.');
    await seedUltimos4Meses();
  } else {
    console.log(`ℹ️  Dataset demo omitido: ya existen ${totalTx} movimientos (usa \`npm run db:seed:demo\` para reemplazarlos).`);
  }
  console.log('🎉 Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
