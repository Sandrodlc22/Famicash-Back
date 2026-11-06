import {
  listarPresupuestos,
  obtenerPresupuestoPorId,
  crearPresupuesto,
  actualizarPresupuesto,
  eliminarPresupuesto
} from './presupuestos.service.js';

export const getAll = async (req, res, next) => {
  try {
    const { cuentaId } = req.query;
    const items = await listarPresupuestos({ cuentaId });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const item = await obtenerPresupuestoPorId(req.params.id);
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const nuevo = await crearPresupuesto(req.body);
    res.status(201).json({
      message: 'Presupuesto creado con éxito',
      presupuesto: nuevo
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const actualizado = await actualizarPresupuesto(req.params.id, req.body);
    res.json({
      message: 'Presupuesto actualizado con éxito',
      presupuesto: actualizado
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await eliminarPresupuesto(req.params.id);
    res.json({ message: 'Presupuesto eliminado con éxito.' });
  } catch (error) {
    next(error);
  }
};
