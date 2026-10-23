import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'famicash_default_jwt_access_secret_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'famicash_default_jwt_refresh_secret_2026';

export const ACCESS_TOKEN_EXPIRATION = '5s';
export const REFRESH_TOKEN_EXPIRATION = '7d';

export const ACCESS_COOKIE_MAX_AGE = 5 * 1000; // 15 minutos en ms
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

export function generateAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRATION });
}

export function generateRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRATION });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (err) {
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}
