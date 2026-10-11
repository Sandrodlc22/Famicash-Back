const { Pool } = require('pg');
require('dotenv').config();

// Configuración de conexión a PostgreSQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'famicash_db',
};

let pool = null;
let isPostgresAvailable = false;

// Estado en memoria como fallback de alta fidelidad
const memoryStore = {
  roles: [
    { id: 1, nombre: 'Administrador Familiar', descripcion: 'Acceso total y gestión' },
    { id: 2, nombre: 'Miembro', descripcion: 'Registro y consulta de movimientos' }
  ],
  usuarios: [
    {
      id: 1,
      rol_id: 1,
      nombre: 'Sandro De la Cruz',
      email: 'sandro@gmail.com',
      password_hash: 'password123',
      activo: true,
      created_at: new Date().toISOString()
    }
  ],
  cuentas_bancarias: [
    { id: 1, usuario_id: 1, nombre: 'Cuenta Principal BCP', tipo: 'Tarjeta Débito', saldo_actual: 5420.00, umbral_alerta_pct: 80, alerta_activa: false },
    { id: 2, usuario_id: 1, nombre: 'Interbank Ahorros', tipo: 'Ahorros', saldo_actual: 3150.00, umbral_alerta_pct: 85, alerta_activa: false },
    { id: 3, usuario_id: 1, nombre: 'Billetera Efectivo', tipo: 'Efectivo', saldo_actual: 480.00, umbral_alerta_pct: 70, alerta_activa: false },
    { id: 4, usuario_id: 1, nombre: 'BBVA Crédito Familiar', tipo: 'Tarjeta Crédito', saldo_actual: 1800.00, umbral_alerta_pct: 90, alerta_activa: false }
  ],
  categorias: [
    { id: 1, nombre: 'Comida', tipo: 'GASTO', icono: 'utensils' },
    { id: 2, nombre: 'Transporte', tipo: 'GASTO', icono: 'car' },
    { id: 3, nombre: 'Hogar', tipo: 'GASTO', icono: 'home' },
    { id: 4, nombre: 'Regalos', tipo: 'GASTO', icono: 'gift' },
    { id: 5, nombre: 'Impuestos', tipo: 'GASTO', icono: 'receipt' },
    { id: 6, nombre: 'Salud', tipo: 'GASTO', icono: 'heart-pulse' },
    { id: 7, nombre: 'Educación', tipo: 'GASTO', icono: 'graduation-cap' },
    { id: 8, nombre: 'Otros', tipo: 'GASTO', icono: 'more-horizontal' },
    { id: 9, nombre: 'Sueldo', tipo: 'INGRESO', icono: 'wallet' },
    { id: 10, nombre: 'Transferencia', tipo: 'INGRESO', icono: 'arrow-down-left' },
    { id: 11, nombre: 'Venta / Extra', tipo: 'INGRESO', icono: 'shopping-bag' },
    { id: 12, nombre: 'Otros Ingresos', tipo: 'INGRESO', icono: 'plus-circle' }
  ],
  presupuestos: [
    { id: 1, cuenta_id: 1, periodo_mes: '2026-10-01', limite_asignado: 5000.00, saldo_anterior: 420.00, total_disponible: 5420.00 }
  ],
  movimientos: [
    {
      id: 1,
      cuenta_id: 1,
      categoria_id: 4,
      tipo: 'GASTO',
      monto: 998.00,
      subtipo: 'Extra',
      descripcion: 'Regalos para mamá',
      fecha_movimiento: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    },
    {
      id: 2,
      cuenta_id: 1,
      categoria_id: 1,
      tipo: 'GASTO',
      monto: 125.50,
      subtipo: 'Cotidiano',
      descripcion: 'Almuerzo familiar domingo',
      fecha_movimiento: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
    },
    {
      id: 3,
      cuenta_id: 1,
      categoria_id: 5,
      tipo: 'GASTO',
      monto: 350.00,
      subtipo: 'Fijo',
      descripcion: 'Impuestos y arbitrios',
      fecha_movimiento: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    },
    {
      id: 4,
      cuenta_id: 2,
      categoria_id: 2,
      tipo: 'GASTO',
      monto: 45.00,
      subtipo: 'Cotidiano',
      descripcion: 'Gasolina y peaje',
      fecha_movimiento: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    },
    {
      id: 5,
      cuenta_id: 1,
      categoria_id: 9,
      tipo: 'INGRESO',
      monto: 6500.00,
      subtipo: 'Fijo',
      descripcion: 'Nómina mensual',
      fecha_movimiento: new Date(Date.now() - 72 * 3600 * 1000).toISOString()
    }
  ]
};

let nextMovimientoId = 6;
let nextCuentaId = 5;

async function initDbConnection() {
  try {
    pool = new Pool({
      ...dbConfig,
      connectionTimeoutMillis: 3000
    });
    
    // Intentar test de conexión
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    isPostgresAvailable = true;
    console.log('✅ [PostgreSQL] Conectado exitosamente a la base de datos:', dbConfig.database, 'en', res.rows[0].now);
  } catch (err) {
    isPostgresAvailable = false;
    console.warn('⚠️ [PostgreSQL] No se pudo conectar a PostgreSQL (' + err.message + ').');
    console.warn('ℹ️ [FamiCash] Activando almacenamiento en memoria con datos de demostración pre-cargados.');
    console.warn('ℹ️ Para activar PostgreSQL: cree la base de datos "famicash_db", configure .env y ejecute "npm run setup-db".');
  }
}

// Inicializar conexión
initDbConnection();

module.exports = {
  get isPostgres() {
    return isPostgresAvailable;
  },
  pool,
  dbConfig,
  memoryStore,
  
  // Helpers para operaciones CRUD unificadas
  async query(text, params) {
    if (isPostgresAvailable && pool) {
      return pool.query(text, params);
    }
    throw new Error('Postgres no disponible directamente para SQL raw arbitrario');
  },
  
  // Modelos de Cuentas Bancarias
  cuentas: {
    async listar(usuarioId = 1) {
      if (isPostgresAvailable && pool) {
        const { rows } = await pool.query(
          'SELECT * FROM cuentas_bancarias WHERE usuario_id = $1 ORDER BY id ASC',
          [usuarioId]
        );
        return rows;
      }
      return memoryStore.cuentas_bancarias.filter(c => c.usuario_id === usuarioId);
    },
    async obtenerPorId(id) {
      if (isPostgresAvailable && pool) {
        const { rows } = await pool.query('SELECT * FROM cuentas_bancarias WHERE id = $1', [id]);
        return rows[0] || null;
      }
      return memoryStore.cuentas_bancarias.find(c => c.id === parseInt(id, 10)) || null;
    },
    async crear(cuenta) {
      if (isPostgresAvailable && pool) {
        const { rows } = await pool.query(
          `INSERT INTO cuentas_bancarias (usuario_id, nombre, tipo, saldo_actual, umbral_alerta_pct, alerta_activa)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [
            cuenta.usuario_id || 1,
            cuenta.nombre,
            cuenta.tipo || 'Ahorros',
            cuenta.saldo_actual || 0,
            cuenta.umbral_alerta_pct || 80,
            cuenta.alerta_activa || false
          ]
        );
        return rows[0];
      }
      const nueva = {
        id: nextCuentaId++,
        usuario_id: cuenta.usuario_id || 1,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo || 'Ahorros',
        saldo_actual: parseFloat(cuenta.saldo_actual) || 0,
        umbral_alerta_pct: cuenta.umbral_alerta_pct || 80,
        alerta_activa: cuenta.alerta_activa || false
      };
      memoryStore.cuentas_bancarias.push(nueva);
      return nueva;
    },
    async actualizar(id, campos) {
      const numId = parseInt(id, 10);
      if (isPostgresAvailable && pool) {
        const { rows } = await pool.query(
          `UPDATE cuentas_bancarias 
           SET nombre = COALESCE($1, nombre),
               tipo = COALESCE($2, tipo),
               saldo_actual = COALESCE($3, saldo_actual),
               umbral_alerta_pct = COALESCE($4, umbral_alerta_pct)
           WHERE id = $5 RETURNING *`,
          [campos.nombre, campos.tipo, campos.saldo_actual, campos.umbral_alerta_pct, numId]
        );
        return rows[0];
      }
      const idx = memoryStore.cuentas_bancarias.findIndex(c => c.id === numId);
      if (idx === -1) return null;
      memoryStore.cuentas_bancarias[idx] = { ...memoryStore.cuentas_bancarias[idx], ...campos };
      return memoryStore.cuentas_bancarias[idx];
    },
    async eliminar(id) {
      const numId = parseInt(id, 10);
      if (isPostgresAvailable && pool) {
        await pool.query('DELETE FROM cuentas_bancarias WHERE id = $1', [numId]);
        return true;
      }
      const initialLength = memoryStore.cuentas_bancarias.length;
      memoryStore.cuentas_bancarias = memoryStore.cuentas_bancarias.filter(c => c.id !== numId);
      return memoryStore.cuentas_bancarias.length < initialLength;
    }
  },

  // Modelos de Categorías
  categorias: {
    async listar(tipo = null) {
      if (isPostgresAvailable && pool) {
        let sql = 'SELECT * FROM categorias';
        const params = [];
        if (tipo) {
          sql += ' WHERE tipo = $1';
          params.push(tipo.toUpperCase());
        }
        sql += ' ORDER BY id ASC';
        const { rows } = await pool.query(sql, params);
        return rows;
      }
      if (tipo) {
        return memoryStore.categorias.filter(c => c.tipo.toUpperCase() === tipo.toUpperCase());
      }
      return memoryStore.categorias;
    }
  },

  // Modelos de Movimientos (CRUD completo con ajuste de saldo)
  movimientos: {
    async listar({ limite = 50, cuentaId = null, tipo = null } = {}) {
      if (isPostgresAvailable && pool) {
        let sql = `
          SELECT m.*, 
                 c.nombre AS categoria_nombre, 
                 c.icono AS categoria_icono,
                 cb.nombre AS cuenta_nombre
          FROM movimientos m
          JOIN categorias c ON m.categoria_id = c.id
          JOIN cuentas_bancarias cb ON m.cuenta_id = cb.id
          WHERE 1=1
        `;
        const params = [];
        let pIndex = 1;
        if (cuentaId) {
          sql += ` AND m.cuenta_id = $${pIndex++}`;
          params.push(cuentaId);
        }
        if (tipo) {
          sql += ` AND m.tipo = $${pIndex++}`;
          params.push(tipo.toUpperCase());
        }
        sql += ` ORDER BY m.fecha_movimiento DESC LIMIT $${pIndex}`;
        params.push(limite);
        const { rows } = await pool.query(sql, params);
        return rows;
      }
      
      let list = memoryStore.movimientos.map(m => {
        const cat = memoryStore.categorias.find(c => c.id === m.categoria_id);
        const cuenta = memoryStore.cuentas_bancarias.find(cb => cb.id === m.cuenta_id);
        return {
          ...m,
          categoria_nombre: cat ? cat.nombre : 'Sin categoría',
          categoria_icono: cat ? cat.icono : 'more-horizontal',
          cuenta_nombre: cuenta ? cuenta.nombre : 'Cuenta'
        };
      });

      if (cuentaId) {
        list = list.filter(m => m.cuenta_id === parseInt(cuentaId, 10));
      }
      if (tipo) {
        list = list.filter(m => m.tipo.toUpperCase() === tipo.toUpperCase());
      }
      return list.sort((a, b) => new Date(b.fecha_movimiento) - new Date(a.fecha_movimiento)).slice(0, limite);
    },

    async crear({ cuenta_id, categoria_id, tipo, monto, subtipo = 'Cotidiano', descripcion = '', fecha_movimiento = null }) {
      const parsedMonto = parseFloat(monto);
      const parsedTipo = tipo.toUpperCase();
      const numCuentaId = parseInt(cuenta_id, 10);
      const numCatId = parseInt(categoria_id, 10);
      const fecha = fecha_movimiento || new Date().toISOString();

      if (isPostgresAvailable && pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { rows } = await client.query(
            `INSERT INTO movimientos (cuenta_id, categoria_id, tipo, monto, subtipo, descripcion, fecha_movimiento)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [numCuentaId, numCatId, parsedTipo, parsedMonto, subtipo, descripcion, fecha]
          );
          // Nota: El trigger actualizar_saldo_cuenta en Postgres ya actualiza saldo_actual
          await client.query('COMMIT');
          return rows[0];
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }

      // Memory implementation with atomic balance update
      const nuevoMov = {
        id: nextMovimientoId++,
        cuenta_id: numCuentaId,
        categoria_id: numCatId,
        tipo: parsedTipo,
        monto: parsedMonto,
        subtipo,
        descripcion,
        fecha_movimiento: fecha
      };
      memoryStore.movimientos.unshift(nuevoMov);

      // Actualizar saldo de la cuenta
      const cuenta = memoryStore.cuentas_bancarias.find(c => c.id === numCuentaId);
      if (cuenta) {
        if (parsedTipo === 'GASTO') {
          cuenta.saldo_actual = Math.round((cuenta.saldo_actual - parsedMonto) * 100) / 100;
        } else if (parsedTipo === 'INGRESO') {
          cuenta.saldo_actual = Math.round((cuenta.saldo_actual + parsedMonto) * 100) / 100;
        }
      }

      const cat = memoryStore.categorias.find(c => c.id === numCatId);
      return {
        ...nuevoMov,
        categoria_nombre: cat ? cat.nombre : 'Sin categoría',
        categoria_icono: cat ? cat.icono : 'more-horizontal',
        cuenta_nombre: cuenta ? cuenta.nombre : 'Cuenta'
      };
    },

    async eliminar(id) {
      const numId = parseInt(id, 10);
      if (isPostgresAvailable && pool) {
        await pool.query('DELETE FROM movimientos WHERE id = $1', [numId]);
        return true;
      }

      const idx = memoryStore.movimientos.findIndex(m => m.id === numId);
      if (idx === -1) return false;

      const mov = memoryStore.movimientos[idx];
      const cuenta = memoryStore.cuentas_bancarias.find(c => c.id === mov.cuenta_id);
      if (cuenta) {
        if (mov.tipo === 'GASTO') {
          cuenta.saldo_actual = Math.round((cuenta.saldo_actual + mov.monto) * 100) / 100;
        } else {
          cuenta.saldo_actual = Math.round((cuenta.saldo_actual - mov.monto) * 100) / 100;
        }
      }

      memoryStore.movimientos.splice(idx, 1);
      return true;
    }
  },

  // Resumen financiero
  async obtenerResumen() {
    const cuentas = await this.cuentas.listar(1);
    const movimientos = await this.movimientos.listar({ limite: 100 });

    const saldoTotal = cuentas.reduce((acc, c) => acc + parseFloat(c.saldo_actual || 0), 0);
    
    // Calcular ingresos y gastos totales del mes actual
    let totalGastos = 0;
    let totalIngresos = 0;
    const desgloseCategorias = {};

    movimientos.forEach(m => {
      const monto = parseFloat(m.monto || 0);
      if (m.tipo === 'GASTO') {
        totalGastos += monto;
        const cat = m.categoria_nombre || 'Otros';
        desgloseCategorias[cat] = (desgloseCategorias[cat] || 0) + monto;
      } else if (m.tipo === 'INGRESO') {
        totalIngresos += monto;
      }
    });

    return {
      saldoTotal: Math.round(saldoTotal * 100) / 100,
      totalGastos: Math.round(totalGastos * 100) / 100,
      totalIngresos: Math.round(totalIngresos * 100) / 100,
      presupuestoMensual: 5000.00,
      porcentajePresupuestoGastado: Math.min(100, Math.round((totalGastos / 5000.00) * 100)),
      desgloseCategorias,
      cuentasResumen: cuentas,
      movimientosRecientes: movimientos.slice(0, 15)
    };
  }
};

