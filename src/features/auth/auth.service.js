import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../lib/jwt/jwt.js';

const PERSONAS = ['FAMILIA', 'ANTHONY', 'VANESSA', 'LARA'];

export function sanitizeUser(u) {
  return { id: u.id, nombre: u.nombre, email: u.email, persona: u.persona, activo: u.activo };
}

async function emitirTokens(user) {
  const payload = { id: user.id, email: user.email, persona: user.persona };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await prisma.usuario.update({ where: { id: user.id }, data: { refreshToken } });
  return { usuario: sanitizeUser(user), accessToken, refreshToken };
}

export async function registerUser({ nombre, email, password, persona }) {
  if (!nombre?.trim() || !email?.trim() || !password) {
    throw new AppError('Nombre, correo y contraseña son obligatorios.', 400);
  }
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new AppError('Correo electrónico inválido.', 400);
  if (password.length < 6) throw new AppError('La contraseña debe tener al menos 6 caracteres.', 400);
  if (await prisma.usuario.findUnique({ where: { email: cleanEmail } })) {
    throw new AppError('El correo ya está registrado.', 409);
  }
  const user = await prisma.usuario.create({
    data: {
      nombre: nombre.trim(),
      email: cleanEmail,
      passwordHash: await bcrypt.hash(password, 10),
      persona: PERSONAS.includes(persona) ? persona : 'FAMILIA'
    }
  });
  return emitirTokens(user);
}

export async function loginUser({ email, password }) {
  if (!email?.trim() || !password) throw new AppError('Correo y contraseña son requeridos.', 400);
  const user = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.activo || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError('Credenciales inválidas. Verifica tu correo o contraseña.', 401);
  }
  return emitirTokens(user);
}

export async function refreshUserSession(token) {
  if (!token) throw new AppError('Sesión no encontrada.', 401);
  const decoded = verifyRefreshToken(token);
  if (!decoded?.id) throw new AppError('Sesión expirada.', 401);
  const user = await prisma.usuario.findUnique({ where: { id: decoded.id } });
  if (!user || !user.activo) throw new AppError('Usuario no encontrado o inactivo.', 401);
  return emitirTokens(user);
}

export async function logoutUser(userId) {
  if (userId) {
    await prisma.usuario.update({ where: { id: userId }, data: { refreshToken: null } }).catch(() => null);
  }
}

export async function getCurrentUser(userId) {
  const user = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!user || !user.activo) throw new AppError('Usuario no encontrado.', 404);
  return sanitizeUser(user);
}

export async function updateCurrentUser(userId, { nombre, passwordActual, passwordNueva }) {
  const user = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Usuario no encontrado.', 404);
  const data = {};
  if (nombre?.trim()) data.nombre = nombre.trim();
  if (passwordNueva) {
    if (passwordNueva.length < 6) throw new AppError('La nueva contraseña debe tener al menos 6 caracteres.', 400);
    if (!(await bcrypt.compare(passwordActual || '', user.passwordHash))) {
      throw new AppError('La contraseña actual no es correcta.', 400);
    }
    data.passwordHash = await bcrypt.hash(passwordNueva, 10);
  }
  const updated = await prisma.usuario.update({ where: { id: userId }, data });
  return sanitizeUser(updated);
}
