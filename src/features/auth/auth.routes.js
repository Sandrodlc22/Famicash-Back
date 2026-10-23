import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  me
} from './auth.controller.js';
import { authenticateToken } from '../../lib/middleware/auth.middleware.js';

const router = Router();

// Rutas públicas de autenticación
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/refresh', refresh);
router.post('/logout', logout);

// Ruta protegida para obtener los datos del usuario logeado y sus vistas
router.get('/me', authenticateToken, me);

export default router;
