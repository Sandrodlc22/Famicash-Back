-- ============================================================
-- 🌿 FAMICASH - SCRIPT COMPLETO PARA DBEAVER / POSTGRESQL
-- Usuario: Sandro De la Cruz (sandro@gmail.com)
-- Ejecución recomendada en DBeaver: Alt + X (Ejecutar script SQL)
-- ============================================================

-- PASO PREVIO EN DBEAVER:
-- 1. Conéctate a tu servidor PostgreSQL local (localhost:5432, usuario: postgres).
-- 2. Asegúrate de estar conectado a la base de datos 'famicash_db'
--    (Si no existe, clic derecho en Databases -> Create New Database -> famicash_db).
-- 3. Abre este archivo en DBeaver y presiona: Alt + X

-- ============================================================
-- 1. LIMPIEZA DE TABLAS PREVIAS (SI EXISTIERAN)
-- ============================================================
DROP TRIGGER IF EXISTS trg_actualizar_saldo_movimiento ON movimientos CASCADE;
DROP FUNCTION IF EXISTS actualizar_saldo_cuenta CASCADE;

DROP TABLE IF EXISTS movimientos CASCADE;
DROP TABLE IF EXISTS presupuestos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS cuentas_bancarias CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ============================================================
-- 2. CREACIÓN DE TABLAS (MODELO FÍSICO OPTIMIZADO)
-- ============================================================

-- 1. ROLES (Niveles de acceso del sistema)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USUARIOS (Credenciales y sesión)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    rol_id INT REFERENCES roles(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CUENTAS BANCARIAS (Tarjetas y alertas de límite)
CREATE TABLE cuentas_bancarias (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(80) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    saldo_actual NUMERIC(12, 2) DEFAULT 0.00,
    umbral_alerta_pct INT DEFAULT 80,
    alerta_activa BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CATEGORIAS (Clasificador sin topes rígidos)
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('GASTO', 'INGRESO')),
    icono VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. PRESUPUESTOS (Tope mensual acumulativo)
CREATE TABLE presupuestos (
    id SERIAL PRIMARY KEY,
    cuenta_id INT NOT NULL REFERENCES cuentas_bancarias(id) ON DELETE CASCADE,
    periodo_mes DATE NOT NULL,
    limite_asignado NUMERIC(12, 2) NOT NULL,
    saldo_anterior NUMERIC(12, 2) DEFAULT 0.00,
    total_disponible NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. MOVIMIENTOS (Libro diario de gastos e ingresos)
CREATE TABLE movimientos (
    id BIGSERIAL PRIMARY KEY,
    cuenta_id INT NOT NULL REFERENCES cuentas_bancarias(id) ON DELETE CASCADE,
    categoria_id INT NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('GASTO', 'INGRESO')),
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    subtipo VARCHAR(30) DEFAULT 'Cotidiano',
    descripcion VARCHAR(255),
    fecha_movimiento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. ÍNDICES DE RENDIMIENTO
-- ============================================================
CREATE INDEX idx_movimientos_cuenta ON movimientos(cuenta_id);
CREATE INDEX idx_movimientos_categoria ON movimientos(categoria_id);
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha_movimiento DESC);
CREATE INDEX idx_cuentas_usuario ON cuentas_bancarias(usuario_id);
CREATE INDEX idx_presupuestos_periodo ON presupuestos(periodo_mes);

-- ============================================================
-- 4. DISPARADOR (TRIGGER): Actualización automática de saldo
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_saldo_cuenta()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.tipo = 'GASTO' THEN
            UPDATE cuentas_bancarias 
            SET saldo_actual = saldo_actual - NEW.monto 
            WHERE id = NEW.cuenta_id;
        ELSIF NEW.tipo = 'INGRESO' THEN
            UPDATE cuentas_bancarias 
            SET saldo_actual = saldo_actual + NEW.monto 
            WHERE id = NEW.cuenta_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.tipo = 'GASTO' THEN
            UPDATE cuentas_bancarias 
            SET saldo_actual = saldo_actual + OLD.monto 
            WHERE id = OLD.cuenta_id;
        ELSIF OLD.tipo = 'INGRESO' THEN
            UPDATE cuentas_bancarias 
            SET saldo_actual = saldo_actual - OLD.monto 
            WHERE id = OLD.cuenta_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.tipo = 'GASTO' THEN
            UPDATE cuentas_bancarias SET saldo_actual = saldo_actual + OLD.monto WHERE id = OLD.cuenta_id;
        ELSE
            UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - OLD.monto WHERE id = OLD.cuenta_id;
        END IF;
        IF NEW.tipo = 'GASTO' THEN
            UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - NEW.monto WHERE id = NEW.cuenta_id;
        ELSE
            UPDATE cuentas_bancarias SET saldo_actual = saldo_actual + NEW.monto WHERE id = NEW.cuenta_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_saldo_movimiento
AFTER INSERT OR UPDATE OR DELETE ON movimientos
FOR EACH ROW EXECUTE FUNCTION actualizar_saldo_cuenta();

-- ============================================================
-- 5. DATOS DE DEMOSTRACIÓN (SEED)
-- ============================================================

-- Roles
INSERT INTO roles (id, nombre, descripcion) VALUES
(1, 'Administrador Familiar', 'Acceso total y gestión de miembros y presupuestos'),
(2, 'Miembro Familiar', 'Registro y consulta de movimientos')
ON CONFLICT (id) DO NOTHING;

-- Usuario Principal: Sandro De la Cruz
INSERT INTO usuarios (id, rol_id, nombre, email, password_hash, activo) VALUES
(1, 1, 'Sandro De la Cruz', 'sandro@gmail.com', 'password123', true)
ON CONFLICT (id) DO NOTHING;

-- Cuentas Bancarias
INSERT INTO cuentas_bancarias (id, usuario_id, nombre, tipo, saldo_actual, umbral_alerta_pct, alerta_activa) VALUES
(1, 1, 'Cuenta Principal BCP', 'Tarjeta Débito', 5420.00, 80, false),
(2, 1, 'Interbank Ahorros', 'Ahorros', 3150.00, 85, false),
(3, 1, 'Billetera Efectivo', 'Efectivo', 480.00, 70, false),
(4, 1, 'BBVA Crédito Familiar', 'Tarjeta Crédito', 1800.00, 90, false)
ON CONFLICT (id) DO NOTHING;

-- Categorías
INSERT INTO categorias (id, nombre, tipo, icono) VALUES
(1, 'Comida', 'GASTO', 'utensils'),
(2, 'Transporte', 'GASTO', 'car'),
(3, 'Hogar', 'GASTO', 'home'),
(4, 'Regalos', 'GASTO', 'gift'),
(5, 'Impuestos', 'GASTO', 'receipt'),
(6, 'Salud', 'GASTO', 'heart-pulse'),
(7, 'Educación', 'GASTO', 'graduation-cap'),
(8, 'Otros', 'GASTO', 'more-horizontal'),
(9, 'Sueldo', 'INGRESO', 'wallet'),
(10, 'Transferencia', 'INGRESO', 'arrow-down-left'),
(11, 'Venta / Extra', 'INGRESO', 'shopping-bag'),
(12, 'Otros Ingresos', 'INGRESO', 'plus-circle')
ON CONFLICT (id) DO NOTHING;

-- Presupuesto Mensual
INSERT INTO presupuestos (id, cuenta_id, periodo_mes, limite_asignado, saldo_anterior, total_disponible) VALUES
(1, 1, CURRENT_DATE, 5000.00, 420.00, 5420.00)
ON CONFLICT (id) DO NOTHING;

-- Movimientos de demostración
INSERT INTO movimientos (cuenta_id, categoria_id, tipo, monto, subtipo, descripcion, fecha_movimiento) VALUES
(1, 4, 'GASTO', 998.00, 'Extra', 'Regalos de cumpleaños', NOW() - INTERVAL '2 hours'),
(1, 1, 'GASTO', 125.50, 'Cotidiano', 'Almuerzo familiar domingo', NOW() - INTERVAL '5 hours'),
(1, 5, 'GASTO', 350.00, 'Fijo', 'Pago mensual de arbitrios', NOW() - INTERVAL '1 day'),
(2, 2, 'GASTO', 45.00, 'Cotidiano', 'Combustible y peaje', NOW() - INTERVAL '2 days'),
(1, 3, 'GASTO', 280.00, 'Fijo', 'Compras de supermercado del mes', NOW() - INTERVAL '3 days'),
(1, 9, 'INGRESO', 6500.00, 'Fijo', 'Depósito nómina mensual', NOW() - INTERVAL '4 days'),
(2, 10, 'INGRESO', 800.00, 'Extra', 'Transferencia ahorro familiar', NOW() - INTERVAL '5 days');

-- Sincronizar secuencias
SELECT setval('roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM roles));
SELECT setval('usuarios_id_seq', (SELECT COALESCE(MAX(id), 1) FROM usuarios));
SELECT setval('cuentas_bancarias_id_seq', (SELECT COALESCE(MAX(id), 1) FROM cuentas_bancarias));
SELECT setval('categorias_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categorias));
SELECT setval('presupuestos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM presupuestos));
SELECT setval('movimientos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM movimientos));

-- Verificación final
SELECT '¡Base de datos FamiCash configurada con éxito en PostgreSQL para Sandro De la Cruz!' AS resultado;
