import { Router } from 'express';
import { z } from 'zod';
import { AuthedRequest, requireAuth } from '../middleware/auth.js';
import { AuditLog } from '../models/AuditLog.js';

const router = Router();

const eventSchema = z.object({ event: z.string().min(3), screen: z.string().optional() });

router.post('/analytics/upsell', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = eventSchema.parse(req.body || {});
    await AuditLog.create({ userId: req.userId, type: 'upsell', meta: body });
    res.status(201).json({});
  } catch (e) { next(e); }
});

export default router;
