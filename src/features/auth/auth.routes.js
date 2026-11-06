import { Router } from 'express';
import * as c from './auth.controller.js';
import { authenticateToken } from './auth.middleware.js';

const router = Router();

router.post('/register', c.register);
router.post('/login', c.login);
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);
router.get('/me', authenticateToken, c.me);
router.patch('/me', authenticateToken, c.updateMe);

export default router;
