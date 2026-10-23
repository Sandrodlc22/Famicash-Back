import { prisma } from '../src/lib/prisma/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // 1. Roles
  const roles = [
    { nombre: 'Administrador Familiar', descripcion: 'Acceso total y administración de miembros, presupuestos y cuentas' },
    { nombre: 'Esposo / Padre', descripcion: 'Gestión financiera completa del hogar' },
    { nombre: 'Esposa / Madre', descripcion: 'Gestión financiera completa del hogar' },
    { nombre: 'Hijo / Hija', descripcion: 'Registro de gastos propios y consulta básica' },
    { nombre: 'Familiar', descripcion: 'Registro de gastos y consultas personales' },
    { nombre: 'Miembro Familiar', descripcion: 'Registro y consulta de movimientos' }
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { nombre: r.nombre },
      update: { descripcion: r.descripcion },
      create: r
    });
  }
  console.log('✅ Roles sembrados exitosamente.');

  // 2. Categorías
  const categorias = [
    // Gasto
    { nombre: 'Comida', tipo: 'GASTO', icono: 'utensils' },
    { nombre: 'Transporte', tipo: 'GASTO', icono: 'car' },
    { nombre: 'Hogar', tipo: 'GASTO', icono: 'home' },
    { nombre: 'Regalos', tipo: 'GASTO', icono: 'gift' },
    { nombre: 'Impuestos', tipo: 'GASTO', icono: 'receipt' },
    { nombre: 'Salud', tipo: 'GASTO', icono: 'heart-pulse' },
    { nombre: 'Educación', tipo: 'GASTO', icono: 'graduation-cap' },
    { nombre: 'Otros', tipo: 'GASTO', icono: 'more-horizontal' },
    // Ingreso
    { nombre: 'Sueldo', tipo: 'INGRESO', icono: 'wallet' },
    { nombre: 'Transferencia', tipo: 'INGRESO', icono: 'arrow-down-left' },
    { nombre: 'Venta / Extra', tipo: 'INGRESO', icono: 'shopping-bag' },
    { nombre: 'Otros Ingresos', tipo: 'INGRESO', icono: 'plus-circle' }
  ];

  for (const c of categorias) {
    const existing = await prisma.categoria.findFirst({
      where: { nombre: c.nombre, tipo: c.tipo }
    });
    if (!existing) {
      await prisma.categoria.create({ data: c });
    }
  }
  console.log('✅ Categorías sembradas exitosamente.');

  // 3. Usuario demo (Sandro De la Cruz)
  const adminRole = await prisma.role.findUnique({
    where: { nombre: 'Administrador Familiar' }
  });

  const demoEmail = 'sandro@gmail.com';
  const existingUser = await prisma.usuario.findUnique({
    where: { email: demoEmail }
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = await prisma.usuario.create({
      data: {
        nombre: 'Sandro De la Cruz',
        email: demoEmail,
        passwordHash: hashedPassword,
        rolId: adminRole?.id,
        activo: true
      }
    });

    // Cuentas demo para el usuario
    const cuentas = [
      { usuarioId: user.id, nombre: 'Cuenta Principal BCP', tipo: 'Tarjeta Débito', saldoActual: 5420.00, umbralAlertaPct: 80 },
      { usuarioId: user.id, nombre: 'Interbank Ahorros', tipo: 'Ahorros', saldoActual: 3150.00, umbralAlertaPct: 85 },
      { usuarioId: user.id, nombre: 'Billetera Efectivo', tipo: 'Efectivo', saldoActual: 480.00, umbralAlertaPct: 70 },
      { usuarioId: user.id, nombre: 'BBVA Crédito Familiar', tipo: 'Tarjeta Crédito', saldoActual: 1800.00, umbralAlertaPct: 90 }
    ];

    for (const c of cuentas) {
      await prisma.cuentaBancaria.create({ data: c });
    }
    console.log('✅ Usuario demo creado: sandro@gmail.com / admin123 con cuentas iniciales.');
  }

  console.log('🎉 Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
