const express = require('express');
const router = express.Router();
const db = require('../../../database/db');

// Obtener resumen financiero completo para la vista de Resumen / Dashboard
router.get('/', async (req, res) => {
  try {
    const resumen = await db.obtenerResumen();
    res.json(resumen);
  } catch (err) {
    console.error('Error generando resumen:', err);
    res.status(500).json({ error: 'Error al obtener resumen financiero' });
  }
});

module.exports = router;
