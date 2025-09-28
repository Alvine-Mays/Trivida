import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { sendExpoPush } from '../services/expo.js';

const router = Router();

const bodySchema = z.object({ message: z.string().default('Test Trivida notification') });
router.post('/notifications/test', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { message } = bodySchema.parse(req.body || {});
    const user = await User.findById(req.userId);
    const tokens = user?.expoPushTokens || [];
    if (!tokens.length) return res.json({ status: 'no_tokens' });
    const msgs = tokens.map(t => ({ to: t, body: message }));
    const result = await sendExpoPush(msgs);
    res.json({ status: 'ok', tickets: result.tickets.length, failed: result.failed.length });
  } catch (e) { next(e); }
});

export default router;
