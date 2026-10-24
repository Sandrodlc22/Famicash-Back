import {
  listarCategorias,
  obtenerCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria
} from './categorias.service.js';

export const getAll = async (req, res, next) => {
  try {
    const { tipo } = req.query;
    const categorias = await listarCategorias(tipo);
    res.json(categorias);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const categoria = await obtenerCategoriaPorId(req.params.id);
    res.json(categoria);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const nueva = await crearCategoria(req.body);
    res.status(201).json(nueva);
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const actualizada = await actualizarCategoria(req.params.id, req.body);
    res.json(actualizada);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await eliminarCategoria(req.params.id);
    res.json({ message: 'Categoría eliminada con éxito.' });
  } catch (error) {
    next(error);
  }
};
