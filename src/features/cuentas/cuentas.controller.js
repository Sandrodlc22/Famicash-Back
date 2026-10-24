import {
  listarCuentas,
  obtenerCuentaPorId,
  crearCuenta,
  actualizarCuenta,
  eliminarCuenta
} from './cuentas.service.js';

export const getAll = async (req, res, next) => {
  try {
    const usuarioId = req.user?.id || req.query.usuarioId || null;
    const cuentas = await listarCuentas(usuarioId);
    res.json(cuentas);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const cuenta = await obtenerCuentaPorId(req.params.id);
    res.json(cuenta);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const usuarioId = req.user?.id || null;
    const nueva = await crearCuenta(req.body, usuarioId);
    res.status(201).json(nueva);
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const actualizada = await actualizarCuenta(req.params.id, req.body);
    res.json(actualizada);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await eliminarCuenta(req.params.id);
    res.json({ message: 'Cuenta bancaria eliminada con éxito.' });
  } catch (error) {
    next(error);
  }
};
