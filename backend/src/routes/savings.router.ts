import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import { SavingsPlan } from '../models/SavingsPlan.js';
import { ApiError } from '../utils/errors.js';

const router = Router();

const planSchema = z.object({
  name: z.string(),
  cadence: z.enum(['weekly', 'monthly']),
  targetAmountMinor: z.number().int().positive(),
  currency: z.string().default('XAF'),
  startDate: z.string().datetime().optional(),
  annualInterestRate: z.number().min(0).max(1).optional(),
  autoRemind: z.boolean().optional(),
});

router.get('/savings/plans', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const items = await SavingsPlan.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (e) { next(e); }
});

router.post('/savings/plans', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = planSchema.parse(req.body);
    const created = await SavingsPlan.create({ userId: req.userId, ...body, startDate: body.startDate ? new Date(body.startDate) : new Date() });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

router.get('/savings/plans/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const plan = await SavingsPlan.findOne({ _id: req.params.id, userId: req.userId });
    if (!plan) throw new ApiError('NOT_FOUND', 'Not found', 404);
    res.setHeader('ETag', String(plan.updatedAt.getTime()));
    res.json(plan);
  } catch (e) { next(e); }
});

router.patch('/savings/plans/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const plan = await SavingsPlan.findOne({ _id: req.params.id, userId: req.userId });
    if (!plan) throw new ApiError('NOT_FOUND', 'Not found', 404);
    const ifMatch = req.header('If-Match');
    if (ifMatch && ifMatch !== String(plan.updatedAt.getTime())) throw new ApiError('PRECONDITION_FAILED', 'ETag mismatch', 412);
    const body = planSchema.partial().parse(req.body);
    Object.assign(plan, { ...body, startDate: body.startDate ? new Date(body.startDate) : plan.startDate });
    await plan.save();
    res.json(plan);
  } catch (e) { next(e); }
});

router.delete('/savings/plans/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const plan = await SavingsPlan.findOne({ _id: req.params.id, userId: req.userId });
    if (!plan) throw new ApiError('NOT_FOUND', 'Not found', 404);
    const ifMatch = req.header('If-Match');
    if (ifMatch && ifMatch !== String(plan.updatedAt.getTime())) throw new ApiError('PRECONDITION_FAILED', 'ETag mismatch', 412);
    await SavingsPlan.deleteOne({ _id: plan._id });
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get('/savings/plans/:id/projection', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const plan = await SavingsPlan.findOne({ _id: req.params.id, userId: req.userId });
    if (!plan) throw new ApiError('NOT_FOUND', 'Not found', 404);
    const periods = Math.max(1, Math.min(240, Number(req.query.periods || 12)));
    const periodsPerYear = plan.cadence === 'weekly' ? 52 : 12;
    const ratePerPeriod = (plan.annualInterestRate || 0) / periodsPerYear;
    const start = plan.startDate || new Date();
    const depositPerPeriodMinor = Math.round(plan.targetAmountMinor / periods);
    let principalMinor = 0;
    const schedule: any[] = [];
    for (let i = 1; i <= periods; i++) {
      principalMinor += depositPerPeriodMinor;
      const interestMinor = Math.round(principalMinor * ratePerPeriod);
      const totalMinor = principalMinor + interestMinor;
      const date = new Date(start);
      if (plan.cadence === 'weekly') date.setDate(date.getDate() + 7 * i);
      else date.setMonth(date.getMonth() + i);
      schedule.push({ period: i, date: date.toISOString().slice(0,10), principalMinor, interestMinor, totalMinor });
    }
    res.json({ periods, schedule });
  } catch (e) { next(e); }
});

export default router;
