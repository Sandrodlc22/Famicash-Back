import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../../lib/jwt/jwt.js';
import { getRoleConfig } from './role-views.config.js';

/**
 * Sanitiza los datos del usuario para no exponer información sensible
 */
function sanitizeUser(user, avatar = null) {
  const roleName = user.rol?.nombre || 'Administrador Familiar';
  const roleConfig = getRoleConfig(roleName);

  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: roleName,
    rolId: user.rolId,
    activo: user.activo,
    avatar: avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
    vistasPermitidas: roleConfig.vistasPermitidas,
    vistaInicial: roleConfig.vistaInicial,
    permisos: roleConfig.permisos,
    descripcionRol: roleConfig.descripcion
  };
}

/**
 * Registro de un nuevo usuario
 */
export async function registerUser({ nombre, email, password, rol, avatar }) {
  if (!nombre?.trim() || !email?.trim() || !password) {
    throw new AppError('Nombre, correo electrónico y contraseña son obligatorios.', 400);
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new AppError('El formato del correo electrónico no es válido.', 400);
  }

  if (password.length < 6) {
    throw new AppError('La contraseña debe tener al menos 6 caracteres.', 400);
  }

  // Verificar si el correo ya existe
  const existingUser = await prisma.usuario.findUnique({
    where: { email: cleanEmail }
  });

  if (existingUser) {
    throw new AppError('El correo electrónico ya está registrado.', 400);
  }

  // Resolver o crear el rol seleccionado
  const roleName = rol?.trim() || 'Administrador Familiar';
  let targetRole = await prisma.role.findUnique({
    where: { nombre: roleName }
  });

  if (!targetRole) {
    const roleConfig = getRoleConfig(roleName);
    targetRole = await prisma.role.create({
      data: {
        nombre: roleName,
        descripcion: roleConfig.descripcion
      }
    });
  }

  // Hashear contraseña
  const passwordHash = await bcrypt.hash(password, 10);

  // Crear usuario
  const newUser = await prisma.usuario.create({
    data: {
      nombre: nombre.trim(),
      email: cleanEmail,
      passwordHash,
      rolId: targetRole.id,
      activo: true
    },
    include: {
      rol: true
    }
  });

  // Si es un Administrador Familiar o Adulto, crear una cuenta inicial por defecto si no tiene cuentas
  const roleConfig = getRoleConfig(targetRole.nombre);
  if (roleConfig.permisos.puedeGestionarCuentas) {
    await prisma.cuentaBancaria.create({
      data: {
        usuarioId: newUser.id,
        nombre: 'Billetera Efectivo',
        tipo: 'Efectivo',
        saldoActual: 0.00,
        umbralAlertaPct: 70
      }
    });
  }

  // Generar tokens
  const tokenPayload = {
    id: newUser.id,
    email: newUser.email,
    rol: targetRole.nombre
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Guardar refresh token en la base de datos
  await prisma.usuario.update({
    where: { id: newUser.id },
    data: { refreshToken }
  });

  return {
    usuario: sanitizeUser(newUser, avatar),
    accessToken,
    refreshToken
  };
}

/**
 * Inicio de sesión de usuario
 */
export async function loginUser({ email, password }) {
  if (!email?.trim() || !password) {
    throw new AppError('Correo electrónico y contraseña son requeridos.', 400);
  }

  const cleanEmail = email.trim().toLowerCase();

  // Buscar usuario por email con su rol
  const user = await prisma.usuario.findUnique({
    where: { email: cleanEmail },
    include: { rol: true }
  });

  if (!user || !user.activo) {
    throw new AppError('Credenciales inválidas. Verifica tu correo o contraseña.', 401);
  }

  // Validar contraseña
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Credenciales inválidas. Verifica tu correo o contraseña.', 401);
  }

  const roleName = user.rol?.nombre || 'Administrador Familiar';

  // Generar tokens
  const tokenPayload = {
    id: user.id,
    email: user.email,
    rol: roleName
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Rotación de refresh token: guardar el nuevo token en la BD
  await prisma.usuario.update({
    where: { id: user.id },
    data: { refreshToken }
  });

  return {
    usuario: sanitizeUser(user),
    accessToken,
    refreshToken
  };
}

/**
 * Renovación de sesión mediante Refresh Token
 */
export async function refreshUserSession(refreshTokenReceived) {
  if (!refreshTokenReceived) {
    throw new AppError('Refresh token no proporcionado.', 401);
  }

  // Verificar la firma del JWT
  const decoded = verifyRefreshToken(refreshTokenReceived);
  if (!decoded || !decoded.id) {
    throw new AppError('Refresh token inválido o expirado.', 401);
  }

  // Buscar usuario en BD
  const user = await prisma.usuario.findUnique({
    where: { id: decoded.id },
    include: { rol: true }
  });

  if (!user || !user.activo) {
    throw new AppError('Usuario no encontrado o inactivo.', 401);
  }

  // Comprobar que coincida con el refresh token activo en BD
  if (user.refreshToken !== refreshTokenReceived) {
    // Si no coincide, puede haber habido un intento de reutilización de token: invalidar el token en BD por seguridad
    await prisma.usuario.update({
      where: { id: user.id },
      data: { refreshToken: null }
    });
    throw new AppError('Sesión inválida o revocada. Por favor vuelve a iniciar sesión.', 403);
  }

  const roleName = user.rol?.nombre || 'Administrador Familiar';

  // Generar nuevos tokens (Rotación)
  const tokenPayload = {
    id: user.id,
    email: user.email,
    rol: roleName
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  // Actualizar en BD
  await prisma.usuario.update({
    where: { id: user.id },
    data: { refreshToken: newRefreshToken }
  });

  return {
    usuario: sanitizeUser(user),
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
}

/**
 * Cierre de sesión (invalidación de refresh token en BD)
 */
export async function logoutUser(userId) {
  if (userId) {
    await prisma.usuario.update({
      where: { id: userId },
      data: { refreshToken: null }
    }).catch(() => null);
  }
  return true;
}

/**
 * Obtener perfil del usuario autenticado
 */
export async function getCurrentUser(userId) {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    include: { rol: true }
  });

  if (!user || !user.activo) {
    throw new AppError('Usuario no encontrado.', 404);
  }

  return sanitizeUser(user);
}
