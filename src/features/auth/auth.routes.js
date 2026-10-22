const express = require('express');
const router = express.Router();
const db = require('../../../database/db');

// Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar en BD o memoria
    let usuario = null;
    if (db.isPostgres && db.pool) {
      const { rows } = await db.pool.query(
        'SELECT u.*, r.nombre AS rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id WHERE email = $1',
        [email.trim().toLowerCase()]
      );
      usuario = rows[0];
    } else {
      usuario = db.memoryStore.usuarios.find(
        u => u.email.toLowerCase() === email.trim().toLowerCase()
      );
    }

    if (!usuario) {
      // Si el email es el sugerido por defecto o cualquier login de prueba
      if (email.toLowerCase().includes('laura') || email.toLowerCase().includes('familia')) {
        usuario = db.memoryStore.usuarios[0];
      } else {
        return res.status(401).json({ error: 'Credenciales inválidas. Pruebe con sandro@gmail.com' });
      }
    }

    // Respuesta con datos de sesión
    const usuarioRes = {
      id: usuario.id,
      nombre: 'Sandro De la Cruz',
      email: usuario.email,
      rol: usuario.rol_nombre || 'Administrador Familiar',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256'
    };

    return res.json({
      message: 'Inicio de sesión exitoso',
      token: 'demo-famicash-jwt-token-xyz',
      usuario: usuarioRes
    });
  } catch (error) {
    console.error('Error en /auth/login:', error);
    return res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

// Obtener usuario actual
router.get('/me', (req, res) => {
  const usuario = db.memoryStore.usuarios[0];
  return res.json({
    id: usuario.id,
    nombre: 'Sandro De la Cruz',
    email: usuario.email,
    rol: 'Administrador Familiar',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256'
  });
});

module.exports = router;

