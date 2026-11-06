import { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error.js';

export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Errores conocidos de Prisma → mensajes legibles
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado.' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'No se puede completar: el registro está en uso por otros datos.' });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido.' });
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
};
