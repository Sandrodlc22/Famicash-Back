import {
  registerUser,
  loginUser,
  refreshUserSession,
  logoutUser,
  getCurrentUser
} from './auth.service.js';
import {
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE_MAX_AGE,
  verifyRefreshToken
} from '../../lib/jwt/jwt.js';

const isProduction = process.env.NODE_ENV === 'production';

// Configuración común de cookies seguras
const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax'
};

/**
 * Función auxiliar para setear cookies HttpOnly
 */
function setAuthCookies(res, accessToken, refreshToken) {
  // Cookie HttpOnly para el Access Token
  res.cookie('accessToken', accessToken, {
    ...baseCookieOptions,
    maxAge: ACCESS_COOKIE_MAX_AGE,
    path: '/'
  });

  // Cookie HttpOnly para el Refresh Token
  res.cookie('refreshToken', refreshToken, {
    ...baseCookieOptions,
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: '/'
  });
}

/**
 * Función auxiliar para limpiar cookies
 */
function clearAuthCookies(res) {
  res.clearCookie('accessToken', {
    ...baseCookieOptions,
    path: '/'
  });
  res.clearCookie('refreshToken', {
    ...baseCookieOptions,
    path: '/'
  });
}

/**
 * Controlador para Registro de Usuario
 */
export async function register(req, res, next) {
  try {
    const { nombre, email, password, rol, avatar } = req.body;
    const result = await registerUser({ nombre, email, password, rol, avatar });

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(201).json({
      message: 'Usuario registrado con éxito',
      token: result.accessToken,
      usuario: result.usuario
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para Inicio de Sesión
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token: result.accessToken,
      usuario: result.usuario
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para Renovar Access Token con Refresh Token
 */
export async function refresh(req, res, next) {
  try {
    const tokenFromCookie = req.cookies?.refreshToken;
    const tokenFromBody = req.body?.refreshToken;
    const refreshTokenReceived = tokenFromCookie || tokenFromBody;

    const result = await refreshUserSession(refreshTokenReceived);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
      message: 'Sesión renovada con éxito',
      token: result.accessToken,
      usuario: result.usuario
    });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
}

/**
 * Controlador para Cerrar Sesión
 */
export async function logout(req, res, next) {
  try {
    // Si viene usuario autenticado o decodificamos el refresh token
    let userId = req.user?.id;

    if (!userId && req.cookies?.refreshToken) {
      const decoded = verifyRefreshToken(req.cookies.refreshToken);
      userId = decoded?.id;
    }

    if (userId) {
      await logoutUser(userId);
    }

    clearAuthCookies(res);

    res.status(200).json({
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
}

/**
 * Controlador para obtener información del usuario actual autenticado
 */
export async function me(req, res, next) {
  try {
    const usuario = await getCurrentUser(req.user.id);
    res.status(200).json({
      usuario
    });
  } catch (error) {
    next(error);
  }
}
