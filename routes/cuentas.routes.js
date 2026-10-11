const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Listar todas las cuentas bancarias del usuario
router.get('/', async (req, res) => {
  try {
    const cuentas = await db.cuentas.listar(1);
    res.json(cuentas);
  } catch (err) {
    console.error('Error listando cuentas:', err);
    res.status(500).json({ error: 'Error al obtener cuentas bancarias' });
  }
});

// Obtener cuenta por ID
router.get('/:id', async (req, res) => {
  try {
    const cuenta = await db.cuentas.obtenerPorId(req.params.id);
    if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json(cuenta);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cuenta' });
  }
});

// Crear nueva cuenta bancaria
router.post('/', async (req, res) => {
  try {
    const { nombre, tipo, saldo_actual, umbral_alerta_pct } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la cuenta es obligatorio' });
    }
    const nueva = await db.cuentas.crear({
      usuario_id: 1,
      nombre,
      tipo: tipo || 'Ahorros',
      saldo_actual: parseFloat(saldo_actual || 0),
      umbral_alerta_pct: parseInt(umbral_alerta_pct || 80, 10),
      alerta_activa: false
    });
    res.status(201).json(nueva);
  } catch (err) {
    console.error('Error creando cuenta:', err);
    res.status(500).json({ error: 'Error al crear cuenta bancaria' });
  }
});

// Actualizar cuenta bancaria
router.put('/:id', async (req, res) => {
  try {
    const actualizada = await db.cuentas.actualizar(req.params.id, req.body);
    if (!actualizada) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json(actualizada);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar cuenta bancaria' });
  }
});

// Eliminar cuenta bancaria
router.delete('/:id', async (req, res) => {
  try {
    const eliminada = await db.cuentas.eliminar(req.params.id);
    if (!eliminada) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json({ message: 'Cuenta bancaria eliminada con éxito' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar cuenta bancaria' });
  }
});

module.exports = router;
