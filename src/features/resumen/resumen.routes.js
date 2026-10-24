import { Router } from 'express';
import { getResumen } from './resumen.controller.js';

const router = Router();

router.get('/', getResumen);

export default router;
