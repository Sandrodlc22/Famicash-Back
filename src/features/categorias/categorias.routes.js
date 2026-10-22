const express = require('express');
const router = express.Router();
const db = require('../../../database/db');

// Listar categorías (filtro opcional ?tipo=GASTO o ?tipo=INGRESO)
router.get('/', async (req, res) => {
  try {
    const { tipo } = req.query;
    const cats = await db.categorias.listar(tipo);
    res.json(cats);
  } catch (err) {
    console.error('Error listando categorías:', err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

module.exports = router;
