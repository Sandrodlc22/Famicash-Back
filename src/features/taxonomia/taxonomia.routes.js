// Taxonomía editable de 3 niveles: Categoría (Área Familiar) → Subcategoría (Rubro) → Detalle (Concepto).
// Soporta crear, editar y eliminar/archivar en los 3 niveles sin errores de llave foránea.
import { Router } from 'express';
import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';
import { toInt } from '../../lib/utils/filtros.js';

const router = Router();
const TIPOS = ['INGRESO', 'GASTO', 'AHORRO'];
const PERSONAS = ['FAMILIA', 'ANTHONY', 'VANESSA', 'LARA'];

const limpio = (v, campo, max) => {
  const s = String(v ?? '').trim();
  if (!s) throw new AppError(`${campo} es obligatorio.`, 400);
  if (s.length > max) throw new AppError(`${campo} admite máximo ${max} caracteres.`, 400);
  return s;
};

/** Árbol completo de la taxonomía */
router.get('/', async (req, res) => {
  const todas = req.query.incluirInactivas === 'true';
  const act = todas ? {} : { activa: true };
  const categorias = await prisma.categoria.findMany({
    where: act,
    orderBy: [{ orden: 'asc' }, { id: 'asc' }],
    include: {
      subcategorias: {
        where: act,
        orderBy: [{ orden: 'asc' }, { id: 'asc' }],
        include: {
          detalles: { where: todas ? {} : { activo: true }, orderBy: [{ orden: 'asc' }, { id: 'asc' }] }
        }
      }
    }
  });
  res.json(categorias);
});

// ---------- Categorías (Áreas Familiares) ----------
router.post('/categorias', async (req, res) => {
  const { codigo, tipo = 'GASTO', persona = 'FAMILIA' } = req.body || {};
  const tipoValido = TIPOS.includes(tipo) ? tipo : 'GASTO';
  const personaValida = PERSONAS.includes(persona) ? persona : 'FAMILIA';
  const codigoLimpio = limpio(codigo, 'Nombre / Código del Área', 60);

  const existente = await prisma.categoria.findUnique({ where: { codigo: codigoLimpio } });
  if (existente) {
    const reactivada = await prisma.categoria.update({
      where: { id: existente.id },
      data: { activa: true, tipo: tipoValido, persona: personaValida }
    });
    return res.status(200).json(reactivada);
  }

  const max = await prisma.categoria.aggregate({ _max: { orden: true } });
  const cat = await prisma.categoria.create({
    data: {
      codigo: codigoLimpio,
      tipo: tipoValido,
      persona: personaValida,
      orden: (max._max.orden || 0) + 1
    }
  });
  res.status(201).json(cat);
});

router.patch('/categorias/:id', async (req, res) => {
  const id = toInt(req.params.id);
  const { codigo, tipo, persona, activa, orden } = req.body || {};
  const data = {};
  if (codigo !== undefined) data.codigo = limpio(codigo, 'Nombre / Código del Área', 60);
  if (tipo !== undefined && TIPOS.includes(tipo)) data.tipo = tipo;
  if (persona !== undefined && PERSONAS.includes(persona)) data.persona = persona;
  if (activa !== undefined) data.activa = Boolean(activa);
  if (orden !== undefined) data.orden = parseInt(orden, 10) || 0;
  res.json(await prisma.categoria.update({ where: { id }, data }));
});

router.delete('/categorias/:id', async (req, res) => {
  const id = toInt(req.params.id);
  const usos = await prisma.transaccion.count({ where: { categoriaId: id } });
  if (usos > 0) {
    await prisma.categoria.update({ where: { id }, data: { activa: false } });
    return res.json({
      archivada: true,
      mensaje: 'El área familiar tiene movimientos históricos: se archivó para conservar tus reportes.'
    });
  }
  const subs = await prisma.subcategoria.findMany({ where: { categoriaId: id }, select: { id: true } });
  const subIds = subs.map((s) => s.id);
  await prisma.$transaction([
    ...(subIds.length
      ? [
          prisma.favorito.deleteMany({ where: { subcategoriaId: { in: subIds } } }),
          prisma.objetivoAhorro.updateMany({
            where: { subcategoriaAhorroId: { in: subIds } },
            data: { subcategoriaAhorroId: null }
          }),
          prisma.detalle.deleteMany({ where: { subcategoriaId: { in: subIds } } }),
          prisma.subcategoria.deleteMany({ where: { id: { in: subIds } } })
        ]
      : []),
    prisma.presupuesto.deleteMany({ where: { categoriaId: id } }),
    prisma.categoria.delete({ where: { id } })
  ]);
  res.json({ eliminada: true, mensaje: 'Área familiar eliminada correctamente.' });
});

// ---------- Subcategorías (Rubros) ----------
router.post('/subcategorias', async (req, res) => {
  const { categoriaId, codigo, persona } = req.body || {};
  const catId = toInt(categoriaId, 'categoriaId');
  const codigoLimpio = limpio(codigo, 'Nombre del Rubro', 80);

  const existente = await prisma.subcategoria.findUnique({
    where: { categoriaId_codigo: { categoriaId: catId, codigo: codigoLimpio } }
  });
  if (existente) {
    const reactivada = await prisma.subcategoria.update({
      where: { id: existente.id },
      data: { activa: true, persona: PERSONAS.includes(persona) ? persona : existente.persona }
    });
    return res.status(200).json(reactivada);
  }

  const max = await prisma.subcategoria.aggregate({ where: { categoriaId: catId }, _max: { orden: true } });
  const sub = await prisma.subcategoria.create({
    data: {
      categoriaId: catId,
      codigo: codigoLimpio,
      persona: PERSONAS.includes(persona) ? persona : null,
      orden: (max._max.orden || 0) + 1
    }
  });
  res.status(201).json(sub);
});

router.patch('/subcategorias/:id', async (req, res) => {
  const id = toInt(req.params.id);
  const { codigo, persona, activa, orden } = req.body || {};
  const data = {};
  if (codigo !== undefined) data.codigo = limpio(codigo, 'Nombre del Rubro', 80);
  if (persona !== undefined) data.persona = PERSONAS.includes(persona) ? persona : null;
  if (activa !== undefined) data.activa = Boolean(activa);
  if (orden !== undefined) data.orden = parseInt(orden, 10) || 0;
  res.json(await prisma.subcategoria.update({ where: { id }, data }));
});

router.delete('/subcategorias/:id', async (req, res) => {
  const id = toInt(req.params.id);
  const usos = await prisma.transaccion.count({ where: { subcategoriaId: id } });
  if (usos > 0) {
    await prisma.subcategoria.update({ where: { id }, data: { activa: false } });
    return res.json({
      archivada: true,
      mensaje: 'El rubro tiene movimientos registrados: se archivó para conservar el histórico.'
    });
  }
  await prisma.$transaction([
    prisma.favorito.deleteMany({ where: { subcategoriaId: id } }),
    prisma.presupuesto.deleteMany({ where: { subcategoriaId: id } }),
    prisma.objetivoAhorro.updateMany({ where: { subcategoriaAhorroId: id }, data: { subcategoriaAhorroId: null } }),
    prisma.detalle.deleteMany({ where: { subcategoriaId: id } }),
    prisma.subcategoria.delete({ where: { id } })
  ]);
  res.json({ eliminada: true, mensaje: 'Rubro eliminado correctamente.' });
});

// ---------- Detalles (Conceptos) ----------
router.post('/detalles', async (req, res) => {
  const { subcategoriaId, nombre } = req.body || {};
  const subId = toInt(subcategoriaId, 'subcategoriaId');
  const nombreLimpio = limpio(nombre, 'Nombre del Concepto', 200);

  const existente = await prisma.detalle.findFirst({
    where: { subcategoriaId: subId, nombre: { equals: nombreLimpio, mode: 'insensitive' } }
  });
  if (existente) {
    const reactivado = await prisma.detalle.update({
      where: { id: existente.id },
      data: { activo: true, nombre: nombreLimpio }
    });
    return res.status(200).json(reactivado);
  }

  const max = await prisma.detalle.aggregate({ where: { subcategoriaId: subId }, _max: { orden: true } });
  const det = await prisma.detalle.create({
    data: { subcategoriaId: subId, nombre: nombreLimpio, orden: (max._max.orden || 0) + 1 }
  });
  res.status(201).json(det);
});

router.patch('/detalles/:id', async (req, res) => {
  const id = toInt(req.params.id);
  const { nombre, activo, orden } = req.body || {};
  const data = {};
  if (nombre !== undefined) data.nombre = limpio(nombre, 'Nombre del Concepto', 200);
  if (activo !== undefined) data.activo = Boolean(activo);
  if (orden !== undefined) data.orden = parseInt(orden, 10) || 0;
  res.json(await prisma.detalle.update({ where: { id }, data }));
});

router.delete('/detalles/:id', async (req, res) => {
  const id = toInt(req.params.id);
  const usos = await prisma.transaccion.count({ where: { detalleId: id } });
  if (usos > 0) {
    await prisma.detalle.update({ where: { id }, data: { activo: false } });
    return res.json({
      archivada: true,
      mensaje: 'El concepto tiene movimientos registrados: se archivó para conservar el histórico.'
    });
  }
  await prisma.detalle.delete({ where: { id } });
  res.json({ eliminada: true, mensaje: 'Concepto eliminado correctamente.' });
});

// ---------- Reordenar (cualquier nivel) ----------
router.put('/orden', async (req, res) => {
  const { nivel, ids } = req.body || {};
  const modelo = { categoria: prisma.categoria, subcategoria: prisma.subcategoria, detalle: prisma.detalle }[nivel];
  if (!modelo || !Array.isArray(ids)) throw new AppError('Parámetros de orden inválidos.', 400);
  await prisma.$transaction(ids.map((id, i) => modelo.update({ where: { id: toInt(id) }, data: { orden: i + 1 } })));
  res.json({ ok: true });
});

export default router;
