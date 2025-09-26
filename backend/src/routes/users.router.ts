import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = Router();

const patchSchema = z.object({ name: z.string().optional(), locale: z.enum(['fr', 'en']).optional(), currency: z.string().optional(), settings: z.record(z.any()).optional() });
router.patch('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = patchSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.userId, body, { new: true });
    res.json({ user });
  } catch (e) { next(e); }
});

const tokenSchema = z.object({ token: z.string() });
router.post('/push-tokens', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { token } = tokenSchema.parse(req.body);
    const user = await User.findById(req.userId);
    if (user) {
      const set = new Set([...(user.expoPushTokens || []), token]);
      user.expoPushTokens = Array.from(set).slice(-5);
      await user.save();
    }
    res.status(201).json({});
  } catch (e) { next(e); }
});

router.delete('/push-tokens', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { token } = tokenSchema.parse(req.body);
    await User.updateOne({ _id: req.userId }, { $pull: { expoPushTokens: token } });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
