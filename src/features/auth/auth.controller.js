import * as service from './auth.service.js';
import { ACCESS_COOKIE_MAX_AGE, REFRESH_COOKIE_MAX_AGE, verifyRefreshToken } from '../../lib/jwt/jwt.js';

const isProduction = process.env.NODE_ENV === 'production';
// En Railway front y back están en dominios distintos: las cookies deben ser SameSite=None; Secure
const crossSite = isProduction || Boolean(process.env.RAILWAY_ENVIRONMENT_NAME);
const baseCookie = { httpOnly: true, secure: crossSite, sameSite: crossSite ? 'none' : 'lax', path: '/' };

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('accessToken', accessToken, { ...baseCookie, maxAge: ACCESS_COOKIE_MAX_AGE });
  res.cookie('refreshToken', refreshToken, { ...baseCookie, maxAge: REFRESH_COOKIE_MAX_AGE });
}

function clearAuthCookies(res) {
  res.clearCookie('accessToken', baseCookie);
  res.clearCookie('refreshToken', baseCookie);
}

// El refresh token llega por cookie o, si el navegador bloquea cookies de terceros, por el body
const getRefreshToken = (req) => req.cookies?.refreshToken || req.body?.refreshToken || null;

export async function register(req, res) {
  const r = await service.registerUser(req.body || {});
  setAuthCookies(res, r.accessToken, r.refreshToken);
  res.status(201).json({ usuario: r.usuario, accessToken: r.accessToken, refreshToken: r.refreshToken });
}

export async function login(req, res) {
  const r = await service.loginUser(req.body || {});
  setAuthCookies(res, r.accessToken, r.refreshToken);
  res.json({ usuario: r.usuario, accessToken: r.accessToken, refreshToken: r.refreshToken });
}

export async function refresh(req, res) {
  try {
    const r = await service.refreshUserSession(getRefreshToken(req));
    setAuthCookies(res, r.accessToken, r.refreshToken);
    res.json({ usuario: r.usuario, accessToken: r.accessToken, refreshToken: r.refreshToken });
  } catch (e) {
    clearAuthCookies(res);
    throw e;
  }
}

export async function logout(req, res) {
  const token = getRefreshToken(req);
  const decoded = token ? verifyRefreshToken(token) : null;
  await service.logoutUser(decoded?.id);
  clearAuthCookies(res);
  res.json({ ok: true });
}

export async function me(req, res) {
  res.json({ usuario: await service.getCurrentUser(req.user.id) });
}

export async function updateMe(req, res) {
  res.json({ usuario: await service.updateCurrentUser(req.user.id, req.body || {}) });
}
