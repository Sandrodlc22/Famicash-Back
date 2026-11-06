import {
  listarUsuarios,
  obtenerUsuarioPorId,
  createUser,
  actualizarUsuario,
  eliminarUsuario
} from './usuario.service.js';

export const getAll = async (req, res, next) => {
  try {
    const usuarios = await listarUsuarios();
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const usuario = await obtenerUsuarioPorId(req.params.id);
    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const actualizado = await actualizarUsuario(req.params.id, req.body);
    res.json(actualizado);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await eliminarUsuario(req.params.id);
    res.json({ message: 'Usuario eliminado con éxito.' });
  } catch (error) {
    next(error);
  }
};