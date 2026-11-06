import * as service from './auth.service.js';
import { ACCESS_COOKIE_MAX_AGE, REFRESH_COOKIE_MAX_AGE, verifyRefreshToken } from '../../lib/jwt/jwt.js';

const isProduction = process.env.NODE_ENV === 'production';
const baseCookie = { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', path: '/' };

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('accessToken', accessToken, { ...baseCookie, maxAge: ACCESS_COOKIE_MAX_AGE });
  res.cookie('refreshToken', refreshToken, { ...baseCookie, maxAge: REFRESH_COOKIE_MAX_AGE });
}

function clearAuthCookies(res) {
  res.clearCookie('accessToken', baseCookie);
  res.clearCookie('refreshToken', baseCookie);
}

export async function register(req, res) {
  const r = await service.registerUser(req.body || {});
  setAuthCookies(res, r.accessToken, r.refreshToken);
  res.status(201).json({ usuario: r.usuario });
}

export async function login(req, res) {
  const r = await service.loginUser(req.body || {});
  setAuthCookies(res, r.accessToken, r.refreshToken);
  res.json({ usuario: r.usuario });
}

export async function refresh(req, res) {
  try {
    const r = await service.refreshUserSession(req.cookies?.refreshToken);
    setAuthCookies(res, r.accessToken, r.refreshToken);
    res.json({ usuario: r.usuario });
  } catch (e) {
    clearAuthCookies(res);
    throw e;
  }
}

export async function logout(req, res) {
  const decoded = req.cookies?.refreshToken ? verifyRefreshToken(req.cookies.refreshToken) : null;
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
