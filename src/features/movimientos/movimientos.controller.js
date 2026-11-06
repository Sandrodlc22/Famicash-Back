import {
  listarMovimientos,
  obtenerMovimientoPorId,
  crearMovimiento,
  actualizarMovimiento,
  eliminarMovimiento
} from './movimientos.service.js';

export const getAll = async (req, res, next) => {
  try {
    const { limite, cuentaId, tipo } = req.query;
    const items = await listarMovimientos({ limite, cuentaId, tipo });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const item = await obtenerMovimientoPorId(req.params.id);
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const resultado = await crearMovimiento(req.body);
    res.status(201).json({
      message: 'Movimiento registrado con éxito',
      ...resultado
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const resultado = await actualizarMovimiento(req.params.id, req.body);
    res.json({
      message: 'Movimiento actualizado con éxito',
      ...resultado
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await eliminarMovimiento(req.params.id);
    res.json({ message: 'Movimiento eliminado y saldo restaurado exitosamente' });
  } catch (error) {
    next(error);
  }
};
