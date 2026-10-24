import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';

export const listarCategorias = async (tipo = null) => {
  const where = {};
  if (tipo) {
    const cleanTipo = tipo.toUpperCase();
    if (!['GASTO', 'INGRESO'].includes(cleanTipo)) {
      throw new AppError('El tipo debe ser GASTO o INGRESO.', 400);
    }
    where.tipo = cleanTipo;
  }

  const categorias = await prisma.categoria.findMany({
    where,
    orderBy: { id: 'asc' }
  });

  return categorias;
};

export const obtenerCategoriaPorId = async (id) => {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new AppError('ID de categoría inválido.', 400);

  const categoria = await prisma.categoria.findUnique({
    where: { id: numId }
  });

  if (!categoria) {
    throw new AppError('Categoría no encontrada.', 404);
  }

  return categoria;
};

export const crearCategoria = async ({ nombre, tipo, icono }) => {
  if (!nombre?.trim()) throw new AppError('El nombre de la categoría es obligatorio.', 400);
  if (!tipo) throw new AppError('El tipo de categoría (GASTO o INGRESO) es obligatorio.', 400);

  const cleanTipo = tipo.toUpperCase();
  if (!['GASTO', 'INGRESO'].includes(cleanTipo)) {
    throw new AppError('El tipo debe ser GASTO o INGRESO.', 400);
  }

  const nueva = await prisma.categoria.create({
    data: {
      nombre: nombre.trim(),
      tipo: cleanTipo,
      icono: icono?.trim() || 'more-horizontal'
    }
  });

  return nueva;
};

export const actualizarCategoria = async (id, data) => {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new AppError('ID de categoría inválido.', 400);

  const existing = await prisma.categoria.findUnique({ where: { id: numId } });
  if (!existing) throw new AppError('Categoría no encontrada.', 404);

  const updateData = {};
  if (data.nombre) updateData.nombre = data.nombre.trim();
  if (data.tipo) {
    const cleanTipo = data.tipo.toUpperCase();
    if (!['GASTO', 'INGRESO'].includes(cleanTipo)) {
      throw new AppError('El tipo debe ser GASTO o INGRESO.', 400);
    }
    updateData.tipo = cleanTipo;
  }
  if (data.icono) updateData.icono = data.icono.trim();

  const actualizada = await prisma.categoria.update({
    where: { id: numId },
    data: updateData
  });

  return actualizada;
};

export const eliminarCategoria = async (id) => {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new AppError('ID de categoría inválido.', 400);

  const existing = await prisma.categoria.findUnique({
    where: { id: numId },
    include: { _count: { select: { movimientos: true } } }
  });

  if (!existing) throw new AppError('Categoría no encontrada.', 404);

  if (existing._count.movimientos > 0) {
    throw new AppError('No se puede eliminar la categoría porque contiene movimientos asociados.', 400);
  }

  await prisma.categoria.delete({
    where: { id: numId }
  });

  return true;
};
