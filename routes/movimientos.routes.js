const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Listar movimientos
router.get('/', async (req, res) => {
  try {
    const { limite, cuentaId, tipo } = req.query;
    const items = await db.movimientos.listar({
      limite: limite ? parseInt(limite, 10) : 50,
      cuentaId: cuentaId ? parseInt(cuentaId, 10) : null,
      tipo: tipo || null
    });
    res.json(items);
  } catch (err) {
    console.error('Error listando movimientos:', err);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

// Registrar nuevo movimiento (Gasto o Ingreso)
router.post('/', async (req, res) => {
  try {
    const { cuenta_id, categoria_id, tipo, monto, subtipo, descripcion, fecha_movimiento } = req.body;

    if (!cuenta_id) {
      return res.status(400).json({ error: 'Debe seleccionar una cuenta existente' });
    }
    if (!categoria_id) {
      return res.status(400).json({ error: 'Debe seleccionar una categoría' });
    }
    if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
      return res.status(400).json({ error: 'El monto debe ser un número positivo mayor a 0' });
    }
    const cleanTipo = (tipo || 'GASTO').toUpperCase();
    if (!['GASTO', 'INGRESO'].includes(cleanTipo)) {
      return res.status(400).json({ error: 'El tipo debe ser GASTO o INGRESO' });
    }

    // Verificar existencia de la cuenta
    const cuenta = await db.cuentas.obtenerPorId(cuenta_id);
    if (!cuenta) {
      return res.status(404).json({ error: 'La cuenta bancaria seleccionada no existe' });
    }

    const nuevoMovimiento = await db.movimientos.crear({
      cuenta_id,
      categoria_id,
      tipo: cleanTipo,
      monto: parseFloat(monto),
      subtipo: subtipo || 'Cotidiano',
      descripcion: descripcion ? descripcion.trim() : '',
      fecha_movimiento: fecha_movimiento || new Date().toISOString()
    });

    // Devolver nuevo movimiento junto con el saldo actualizado de la cuenta
    const cuentaActualizada = await db.cuentas.obtenerPorId(cuenta_id);

    res.status(201).json({
      message: 'Movimiento registrado con éxito',
      movimiento: nuevoMovimiento,
      cuentaActualizada
    });
  } catch (err) {
    console.error('Error registrando movimiento:', err);
    res.status(500).json({ error: 'Error interno al registrar el movimiento' });
  }
});

// Eliminar movimiento
router.delete('/:id', async (req, res) => {
  try {
    const eliminado = await db.movimientos.eliminar(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }
    res.json({ message: 'Movimiento eliminado y saldo restaurado exitosamente' });
  } catch (err) {
    console.error('Error eliminando movimiento:', err);
    res.status(500).json({ error: 'Error al eliminar movimiento' });
  }
});

module.exports = router;
