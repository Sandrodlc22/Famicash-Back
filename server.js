const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const cuentasRoutes = require('./routes/cuentas.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const movimientosRoutes = require('./routes/movimientos.routes');
const resumenRoutes = require('./routes/resumen.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Logger simple para depuración
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/cuentas', cuentasRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/movimientos', movimientosRoutes);
app.use('/api/resumen', resumenRoutes);

// Ruta de estado / salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'FamiCash Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 FamiCash Backend Server iniciado en el puerto ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`===============================================`);
});
