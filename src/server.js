import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './features/auth/auth.routes.js';
import { authenticateToken } from './features/auth/auth.middleware.js';
import taxonomiaRoutes from './features/taxonomia/taxonomia.routes.js';
import mediosPagoRoutes from './features/medios-pago/medios-pago.routes.js';
import favoritosRoutes from './features/favoritos/favoritos.routes.js';
import transaccionesRoutes from './features/transacciones/transacciones.routes.js';
import dashboardRoutes from './features/dashboard/dashboard.routes.js';
import presupuestosRoutes from './features/presupuestos/presupuestos.routes.js';
import objetivosRoutes from './features/objetivos/objetivos.routes.js';
import excelRoutes from './features/excel/excel.routes.js';
import { errorHandler } from './lib/middleware/error-handler.js';
import { prisma, connectWithRetry } from './lib/prisma/prisma.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0'; // Requerido en Railway/Docker para aceptar tráfico externo
const isProduction = process.env.NODE_ENV === 'production';

// CORS: en producción solo los orígenes de CLIENT_URL (separados por coma);
// en desarrollo se permite cualquier origen (útil para probar desde el celular en la red local).
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || !isProduction || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Origen no permitido por CORS'));
    },
    credentials: true
  })
);
app.set('trust proxy', 1);
app.set('etag', false);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

if (!isProduction) {
  app.use((req, res, next) => {
    const t = Date.now();
    res.on('finish', () => console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - t}ms)`));
    next();
  });
}

app.get('/api/health', async (req, res) => {
  let db = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }
  res.status(db === 'ok' ? 200 : 503).json({ status: db === 'ok' ? 'ok' : 'degraded', db, app: 'FamiCash API', version: '2.0.0', timestamp: new Date().toISOString() });
});

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas
app.use('/api', authenticateToken);
app.use('/api/taxonomia', taxonomiaRoutes);
app.use('/api/medios-pago', mediosPagoRoutes);
app.use('/api/favoritos', favoritosRoutes);
app.use('/api/transacciones', transaccionesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/presupuestos', presupuestosRoutes);
app.use('/api/objetivos', objetivosRoutes);
app.use('/api/excel', excelRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
app.use(errorHandler);

async function start() {
  console.log(`[APP] Iniciando FamiCash API (NODE_ENV=${process.env.NODE_ENV || 'development'}, CORS=${allowedOrigins.join(', ')})`);
  try {
    await connectWithRetry();
  } catch (err) {
    console.error('[APP] No se pudo conectar a la base de datos. Abortando.', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`FamiCash API v2 escuchando en http://${HOST}:${PORT}/api`);
  });

  const shutdown = async (signal) => {
    console.log(`[APP] ${signal} recibido, cerrando...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
