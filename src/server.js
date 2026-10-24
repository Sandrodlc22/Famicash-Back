import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

import authRoutes from './features/auth/auth.routes.js';
import usuarioRoutes from './features/usuario/usuario.routes.js';
import cuentasRoutes from './features/cuentas/cuentas.routes.js';
import categoriasRoutes from './features/categorias/categorias.routes.js';
import movimientosRoutes from './features/movimientos/movimientos.routes.js';
import resumenRoutes from './features/resumen/resumen.routes.js';
import { errorHandler } from './lib/middleware/error-handler.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de orígenes permitidos para CORS con credenciales (cookies HttpOnly)
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir solicitudes sin origin (como Postman o curl) o provenientes del frontend
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

// Logger simple para depuración
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Rutas de la API por cada feature
app.use('/api/auth', authRoutes);
app.use('/api/usuario', usuarioRoutes);
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

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 FamiCash Backend Server iniciado en el puerto ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`===============================================`);
});
