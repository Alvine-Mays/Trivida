import { Router } from 'express';
import { z } from 'zod';
import { AuthedRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

const checkoutSchema = z.object({ operator: z.enum(['mtn','airtel']), amount: z.number().int().positive() });

router.post('/billing/checkout', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = checkoutSchema.parse(req.body);
    const reference = `CK-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    res.json({ reference, operator: body.operator, amount: body.amount, currency: 'XAF', status: 'pending' });
  } catch (e) { next(e); }
});

export default router;
