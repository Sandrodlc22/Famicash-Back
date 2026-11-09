import { AppError } from '../../lib/errors/app-error.js';
import { verifyAccessToken } from '../../lib/jwt/jwt.js';

export const authenticateToken = (req, res, next) => {
  const header = req.headers.authorization;
  const token = (header?.startsWith('Bearer ') ? header.slice(7) : null) || req.cookies?.accessToken;
  if (!token) throw new AppError('No autenticado.', 401);
  const decoded = verifyAccessToken(token);
  if (!decoded) throw new AppError('Sesión expirada.', 401);
  req.user = decoded;
  next();
};
