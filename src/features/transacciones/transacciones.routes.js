import { Router } from 'express';
import * as service from './transacciones.service.js';
import { toInt } from '../../lib/utils/filtros.js';

const router = Router();

router.get('/', async (req, res) => res.json(await service.listar(req.query)));
router.get('/:id', async (req, res) => res.json(await service.obtener(toInt(req.params.id))));
router.post('/', async (req, res) => res.status(201).json(await service.crear(req.body || {}, req.user.id)));
router.patch('/:id', async (req, res) => res.json(await service.actualizar(toInt(req.params.id), req.body || {})));
router.delete('/:id', async (req, res) => {
  await service.eliminar(toInt(req.params.id));
  res.json({ ok: true });
});

export default router;

