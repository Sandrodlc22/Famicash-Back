import { Router } from 'express';
import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';
import { toInt } from '../../lib/utils/filtros.js';

const router = Router();
const PERSONAS = ['FAMILIA', 'ANTHONY', 'VANESSA', 'LARA'];

router.get('/', async (req, res) => {
  const where = req.query.incluirInactivos === 'true' ? {} : { activo: true };
  res.json(await prisma.medioPago.findMany({ where, orderBy: [{ orden: 'asc' }, { id: 'asc' }] }));
});

router.post('/', async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim().toUpperCase();
  if (!nombre) throw new AppError('El nombre del medio de pago es obligatorio.', 400);
  const personaValida = PERSONAS.includes(req.body?.persona) ? req.body.persona : 'FAMILIA';

  const existente = await prisma.medioPago.findUnique({ where: { nombre } });
  if (existente) {
    const reactivado = await prisma.medioPago.update({
      where: { id: existente.id },
      data: { activo: true, persona: personaValida }
    });
    return res.status(200).json(reactivado);
  }

  const max = await prisma.medioPago.aggregate({ _max: { orden: true } });
  const medio = await prisma.medioPago.create({
    data: {
      nombre,
      persona: personaValida,
      orden: (max._max.orden || 0) + 1
    }
  });
  res.status(201).json(medio);
});

router.patch('/:id', async (req, res) => {
  const id = toInt(req.params.id);
  const { nombre, persona, activo, orden } = req.body || {};
  const data = {};
  if (nombre !== undefined) {
    data.nombre = String(nombre).trim().toUpperCase();
    if (!data.nombre) throw new AppError('El nombre es obligatorio.', 400);
  }
  if (persona !== undefined && PERSONAS.includes(persona)) data.persona = persona;
  if (activo !== undefined) data.activo = Boolean(activo);
  if (orden !== undefined) data.orden = parseInt(orden, 10) || 0;
  res.json(await prisma.medioPago.update({ where: { id }, data }));
});

router.delete('/:id', async (req, res) => {
  const id = toInt(req.params.id);
  const usos = await prisma.transaccion.count({ where: { medioPagoId: id } });
  if (usos > 0) {
    await prisma.medioPago.update({ where: { id }, data: { activo: false } });
    return res.json({
      archivada: true,
      mensaje: 'Este medio de pago tiene movimientos registrados: se archivó para conservar el histórico.'
    });
  }
  await prisma.medioPago.delete({ where: { id } });
  res.json({ eliminada: true, mensaje: 'Medio de pago eliminado correctamente.' });
});

export default router;
