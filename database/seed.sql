-- ============================================================
-- FAMICASH SEED DATA
-- Datos iniciales de demostración
-- ============================================================

-- 1. ROLES
INSERT INTO roles (id, nombre, descripcion) VALUES
(1, 'Administrador Familiar', 'Acceso total y gestión de miembros y presupuestos'),
(2, 'Miembro Familiar', 'Registro y consulta de movimientos')
ON CONFLICT (id) DO NOTHING;

-- 2. USUARIOS (Laura Martínez como en los mockups)
INSERT INTO usuarios (id, rol_id, nombre, email, password_hash, activo) VALUES
(1, 1, 'Laura Martínez', 'sandro@gmail.com', 'password123', true)
ON CONFLICT (id) DO NOTHING;

-- 3. CUENTAS BANCARIAS
INSERT INTO cuentas_bancarias (id, usuario_id, nombre, tipo, saldo_actual, umbral_alerta_pct, alerta_activa) VALUES
(1, 1, 'Cuenta Principal BCP', 'Tarjeta Débito', 5420.00, 80, false),
(2, 1, 'Interbank Ahorros', 'Ahorros', 3150.00, 85, false),
(3, 1, 'Billetera Efectivo', 'Efectivo', 480.00, 70, false),
(4, 1, 'BBVA Crédito Familiar', 'Tarjeta Crédito', 1800.00, 90, false)
ON CONFLICT (id) DO NOTHING;

-- 4. CATEGORIAS
INSERT INTO categorias (id, nombre, tipo, icono) VALUES
-- Categorías de Gasto
(1, 'Comida', 'GASTO', 'utensils'),
(2, 'Transporte', 'GASTO', 'car'),
(3, 'Hogar', 'GASTO', 'home'),
(4, 'Regalos', 'GASTO', 'gift'),
(5, 'Impuestos', 'GASTO', 'receipt'),
(6, 'Salud', 'GASTO', 'heart-pulse'),
(7, 'Educación', 'GASTO', 'graduation-cap'),
(8, 'Otros', 'GASTO', 'more-horizontal'),
-- Categorías de Ingreso
(9, 'Sueldo', 'INGRESO', 'wallet'),
(10, 'Transferencia', 'INGRESO', 'arrow-down-left'),
(11, 'Venta / Extra', 'INGRESO', 'shopping-bag'),
(12, 'Otros Ingresos', 'INGRESO', 'plus-circle')
ON CONFLICT (id) DO NOTHING;

-- 5. PRESUPUESTOS (Mes actual / Octubre)
INSERT INTO presupuestos (id, cuenta_id, periodo_mes, limite_asignado, saldo_anterior, total_disponible) VALUES
(1, 1, CURRENT_DATE, 5000.00, 420.00, 5420.00)
ON CONFLICT (id) DO NOTHING;

-- 6. MOVIMIENTOS INICIALES (Similares al feed del mockup rosado con fechas e importes)
INSERT INTO movimientos (cuenta_id, categoria_id, tipo, monto, subtipo, descripcion, fecha_movimiento) VALUES
(1, 4, 'GASTO', 998.00, 'Extra', 'Regalos de cumpleaños', NOW() - INTERVAL '2 hours'),
(1, 1, 'GASTO', 125.50, 'Cotidiano', 'Almuerzo familiar domingo', NOW() - INTERVAL '5 hours'),
(1, 5, 'GASTO', 350.00, 'Fijo', 'Pago mensual de arbitrios', NOW() - INTERVAL '1 day'),
(2, 2, 'GASTO', 45.00, 'Cotidiano', 'Combustible y peaje', NOW() - INTERVAL '2 days'),
(1, 3, 'GASTO', 280.00, 'Fijo', 'Compras de supermercado del mes', NOW() - INTERVAL '3 days'),
(1, 9, 'INGRESO', 6500.00, 'Fijo', 'Depósito nómina mensual', NOW() - INTERVAL '4 days'),
(2, 10, 'INGRESO', 800.00, 'Extra', 'Transferencia ahorro familiar', NOW() - INTERVAL '5 days');

-- Ajustar las secuencias de PostgreSQL
SELECT setval('roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM roles));
SELECT setval('usuarios_id_seq', (SELECT COALESCE(MAX(id), 1) FROM usuarios));
SELECT setval('cuentas_bancarias_id_seq', (SELECT COALESCE(MAX(id), 1) FROM cuentas_bancarias));
SELECT setval('categorias_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categorias));
SELECT setval('presupuestos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM presupuestos));
SELECT setval('movimientos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM movimientos));
