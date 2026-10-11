-- ============================================================
-- FAMICASH DATABASE SCHEMA (PostgreSQL)
-- Modelo Físico Optimizado basado en Diagrama ER
-- ============================================================

-- Eliminar tablas existentes si se desea reiniciar
DROP TABLE IF EXISTS movimientos CASCADE;
DROP TABLE IF EXISTS presupuestos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS cuentas_bancarias CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- 1. TABLA ROLES
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA USUARIOS
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

-- 3. TABLA CUENTAS_BANCARIAS
CREATE TABLE cuentas_bancarias (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(80) NOT NULL,
    tipo VARCHAR(30) NOT NULL, -- 'Ahorros', 'Corriente', 'Tarjeta Débito', 'Tarjeta Crédito', 'Efectivo'
    saldo_actual NUMERIC(12, 2) DEFAULT 0.00,
    umbral_alerta_pct INT DEFAULT 80,
    alerta_activa BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA CATEGORIAS
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('GASTO', 'INGRESO')),
    icono VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA PRESUPUESTOS
CREATE TABLE presupuestos (
    id SERIAL PRIMARY KEY,
    cuenta_id INT NOT NULL REFERENCES cuentas_bancarias(id) ON DELETE CASCADE,
    periodo_mes DATE NOT NULL,
    limite_asignado NUMERIC(12, 2) NOT NULL,
    saldo_anterior NUMERIC(12, 2) DEFAULT 0.00,
    total_disponible NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA MOVIMIENTOS
CREATE TABLE movimientos (
    id BIGSERIAL PRIMARY KEY,
    cuenta_id INT NOT NULL REFERENCES cuentas_bancarias(id) ON DELETE CASCADE,
    categoria_id INT NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('GASTO', 'INGRESO')),
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    subtipo VARCHAR(30) DEFAULT 'Cotidiano', -- 'Cotidiano', 'Fijo', 'Extra'
    descripcion VARCHAR(255),
    fecha_movimiento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización de consultas
CREATE INDEX idx_movimientos_cuenta ON movimientos(cuenta_id);
CREATE INDEX idx_movimientos_categoria ON movimientos(categoria_id);
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha_movimiento DESC);
CREATE INDEX idx_cuentas_usuario ON cuentas_bancarias(usuario_id);
CREATE INDEX idx_presupuestos_periodo ON presupuestos(periodo_mes);

-- ============================================================
-- TRIGGER: Actualización automática de saldo_actual en cuenta
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
        -- Revertir anterior
        IF OLD.tipo = 'GASTO' THEN
            UPDATE cuentas_bancarias SET saldo_actual = saldo_actual + OLD.monto WHERE id = OLD.cuenta_id;
        ELSE
            UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - OLD.monto WHERE id = OLD.cuenta_id;
        END IF;
        -- Aplicar nuevo
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
