import { AppError } from '../../lib/errors/app-error.js';
import { verifyAccessToken } from '../../lib/jwt/jwt.js';
import { getRoleConfig } from './role-views.config.js';

export const authenticateToken = (req, res, next) => {
  // Buscar token en cookies httpOnly o en el header Authorization
  const tokenFromCookie = req.cookies?.accessToken;
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    throw new AppError('Acceso denegado. No se proporcionó token de autenticación.', 401);
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    throw new AppError('Token inválido o expirado.', 401);
  }

  req.user = decoded;
  next();
};

export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('No autenticado.', 401);
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.rol)) {
      throw new AppError('No tienes los permisos necesarios para realizar esta acción.', 403);
    }

    next();
  };
};

export const requireView = (viewName) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('No autenticado.', 401);
    }

    const { vistasPermitidas } = getRoleConfig(req.user.rol);
    if (!vistasPermitidas.includes(viewName)) {
      throw new AppError(`Tu rol (${req.user.rol}) no tiene acceso a la vista '${viewName}'.`, 403);
    }

    next();
  };
};
