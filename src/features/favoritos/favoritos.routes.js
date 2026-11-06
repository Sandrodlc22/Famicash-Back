// Favoritos por usuario: subcategorías fijadas como accesos rápidos (mínimo sugerido 6, sin tope).
import { Router } from 'express';
import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';
import { toInt } from '../../lib/utils/filtros.js';

const router = Router();

async function listar(usuarioId) {
  const favs = await prisma.favorito.findMany({
    where: { usuarioId, subcategoria: { activa: true } },
    orderBy: { orden: 'asc' },
    include: { subcategoria: { include: { categoria: true } } }
  });
  return favs.map((f) => ({
    id: f.id,
    orden: f.orden,
    subcategoriaId: f.subcategoriaId,
    subcategoria: f.subcategoria.codigo,
    categoriaId: f.subcategoria.categoriaId,
    categoria: f.subcategoria.categoria.codigo,
    tipo: f.subcategoria.categoria.tipo
  }));
}

router.get('/', async (req, res) => {
  res.json(await listar(req.user.id));
});

/** Reemplaza la lista completa (ordenada) de favoritos del usuario */
router.put('/', async (req, res) => {
  const ids = req.body?.subcategoriaIds;
  if (!Array.isArray(ids)) throw new AppError('subcategoriaIds debe ser un arreglo.', 400);
  const unicos = [...new Set(ids.map((x) => toInt(x, 'subcategoriaId')))];
  await prisma.$transaction([
    prisma.favorito.deleteMany({ where: { usuarioId: req.user.id } }),
    prisma.favorito.createMany({
      data: unicos.map((subcategoriaId, i) => ({ usuarioId: req.user.id, subcategoriaId, orden: i + 1 }))
    })
  ]);
  res.json(await listar(req.user.id));
});

export default router;

