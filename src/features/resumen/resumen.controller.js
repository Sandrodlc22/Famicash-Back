import { generarResumenFinanciero } from './resumen.service.js';

export const getResumen = async (req, res, next) => {
  try {
    const usuarioId = req.user?.id || req.query.usuarioId || null;
    const resumen = await generarResumenFinanciero(usuarioId);
    res.json(resumen);
  } catch (error) {
    next(error);
  }
};
