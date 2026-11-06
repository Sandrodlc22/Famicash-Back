import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';

export function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rolId: u.rolId,
    rol_id: u.rolId,
    rol: u.rol?.nombre || null,
    activo: u.activo ?? true,
    created_at: u.createdAt,
    createdAt: u.createdAt
  };
}

export const listarUsuarios = async () => {
  const usuarios = await prisma.usuario.findMany({
    include: {
      rol: true
    },
    orderBy: { id: 'asc' }
  });

  return usuarios.map(sanitizeUser);
};

export const obtenerUsuarioPorId = async (id) => {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new AppError('ID de usuario inválido.', 400);

  const usuario = await prisma.usuario.findUnique({
    where: { id: numId },
    include: {
      rol: true,
      cuentas: true
    }
  });

  if (!usuario) {
    throw new AppError('Usuario no encontrado.', 404);
  }

  return sanitizeUser(usuario);
};

export const createUser = async (data) => {
  const { nombre, email, password, rolId, rol_id, rol } = data;

  if (!nombre?.trim()) throw new AppError('El nombre es obligatorio.', 400);
  if (!email?.trim()) throw new AppError('El email es obligatorio.', 400);
  if (!password || password.length < 6) throw new AppError('La contraseña debe tener al menos 6 caracteres.', 400);

  const cleanEmail = email.trim().toLowerCase();

  const existing = await prisma.usuario.findUnique({
    where: { email: cleanEmail }
  });

  if (existing) {
    throw new AppError('El correo electrónico ya está registrado.', 400);
  }

  // Resolver ID del rol
  let targetRolId = rolId || rol_id || null;
  if (!targetRolId && rol) {
    const roleDb = await prisma.role.findUnique({ where: { nombre: rol.trim() } });
    if (roleDb) targetRolId = roleDb.id;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.usuario.create({
    data: {
      nombre: nombre.trim(),
      email: cleanEmail,
      passwordHash: hashedPassword,
      rolId: targetRolId ? parseInt(targetRolId, 10) : null,
      activo: data.activo !== undefined ? Boolean(data.activo) : true
    },
    include: {
      rol: true
    }
  });

  return sanitizeUser(newUser);
};

export const actualizarUsuario = async (id, data) => {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new AppError('ID de usuario inválido.', 400);

  const existing = await prisma.usuario.findUnique({ where: { id: numId } });
  if (!existing) throw new AppError('Usuario no encontrado.', 404);

  const updateData = {};

  if (data.nombre) updateData.nombre = data.nombre.trim();

  if (data.email) {
    const cleanEmail = data.email.trim().toLowerCase();
    if (cleanEmail !== existing.email) {
      const emailUsed = await prisma.usuario.findUnique({ where: { email: cleanEmail } });
      if (emailUsed) throw new AppError('El correo electrónico ya está en uso por otro usuario.', 400);
      updateData.email = cleanEmail;
    }
  }

  if (data.password) {
    if (data.password.length < 6) throw new AppError('La contraseña debe tener al menos 6 caracteres.', 400);
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  const newRolId = data.rolId || data.rol_id;
  if (newRolId !== undefined) {
    updateData.rolId = newRolId ? parseInt(newRolId, 10) : null;
  } else if (data.rol) {
    const roleDb = await prisma.role.findUnique({ where: { nombre: data.rol.trim() } });
    if (roleDb) updateData.rolId = roleDb.id;
  }

  if (data.activo !== undefined) {
    updateData.activo = Boolean(data.activo);
  }

  const actualizado = await prisma.usuario.update({
    where: { id: numId },
    data: updateData,
    include: {
      rol: true
    }
  });

  return sanitizeUser(actualizado);
};

export const eliminarUsuario = async (id) => {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new AppError('ID de usuario inválido.', 400);

  const existing = await prisma.usuario.findUnique({ where: { id: numId } });
  if (!existing) throw new AppError('Usuario no encontrado.', 404);

  await prisma.usuario.delete({
    where: { id: numId }
  });

  return true;
};