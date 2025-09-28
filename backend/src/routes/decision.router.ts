import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import { Decision } from '../models/Decision.js';
import { checkIfMatch, setEtag } from '../utils/etag.js';
import { ApiError } from '../utils/errors.js';
import { pagedList } from '../utils/pagination.js';

const router = Router();

router.get('/decision/templates', requireAuth, async (req, res, next) => {
  try {
    const p = path.resolve(process.cwd(), 'data/decision_rules.v1.json');
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    const q = String(req.query.query || '').toLowerCase();
    const templates = q ? data.templates.filter((t: any) => t.pattern.some((p: string) => q.includes(p.toLowerCase()))) : data.templates;
    res.json({ templates });
  } catch (e) { next(e); }
});

const factorsSchema = z.object({ budgetImpact: z.number().min(-2).max(2), longTermBenefit: z.number().min(0).max(2), urgency: z.number().min(0).max(1) });

router.post('/decision/score', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { budgetImpact, longTermBenefit, urgency } = factorsSchema.parse(req.body.factors);
    const raw = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data/decision_rules.v1.json'), 'utf8'));
    const s1 = (budgetImpact - raw.factors.scales.budgetImpact[0]) / (raw.factors.scales.budgetImpact[1] - raw.factors.scales.budgetImpact[0]);
    const s2 = (longTermBenefit - raw.factors.scales.longTermBenefit[0]) / (raw.factors.scales.longTermBenefit[1] - raw.factors.scales.longTermBenefit[0]);
    const s3 = (urgency - raw.factors.scales.urgency[0]) / (raw.factors.scales.urgency[1] - raw.factors.scales.urgency[0]);
    const score = raw.factors.weights.budgetImpact * s1 + raw.factors.weights.longTermBenefit * s2 + raw.factors.weights.urgency * s3;
    const rankedOptions = (raw.genericOptions || []).map((o: any) => ({ label: o.label, score }));
    res.json({ score, rankedOptions });
  } catch (e) { next(e); }
});

const createSchema = z.object({ title: z.string(), context: z.string().optional(), factors: factorsSchema, weatherContext: z.any().optional() });
router.post('/decisions', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const raw = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data/decision_rules.v1.json'), 'utf8'));
    const fi = body.factors;
    const s1 = (fi.budgetImpact - raw.factors.scales.budgetImpact[0]) / (raw.factors.scales.budgetImpact[1] - raw.factors.scales.budgetImpact[0]);
    const s2 = (fi.longTermBenefit - raw.factors.scales.longTermBenefit[0]) / (raw.factors.scales.longTermBenefit[1] - raw.factors.scales.longTermBenefit[0]);
    const s3 = (fi.urgency - raw.factors.scales.urgency[0]) / (raw.factors.scales.urgency[1] - raw.factors.scales.urgency[0]);
    const score = raw.factors.weights.budgetImpact * s1 + raw.factors.weights.longTermBenefit * s2 + raw.factors.weights.urgency * s3;
    const decision = await Decision.create({ userId: req.userId, ...body, score });
    // points (premium-only; boosted during premium)
    const { User } = await import('../models/User.js');
    const u = await User.findById(req.userId);
    if (u && (await import('../utils/premium.js')).isPremium(u)) {
      const inc = (await import('../utils/premium.js')).isBoosted(u) ? 10 : 1;
      await User.updateOne({ _id: req.userId }, { $inc: { points: inc } });
    }
    res.status(201).json({ decision });
  } catch (e) { next(e); }
});

router.get('/decisions', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const limit = Math.min(100, Number(req.query.limit || 20));
    const status = req.query.status as string | undefined;
    const filter: any = { userId: req.userId };
    if (status) filter.status = status;
    const { items, nextCursor } = await pagedList(Decision, filter, limit, String(req.query.cursor || ''));
    res.json({ items, nextCursor });
  } catch (e) { next(e); }
});

router.get('/decisions/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const decision = await Decision.findOne({ _id: req.params.id, userId: req.userId });
    if (!decision) throw new ApiError('NOT_FOUND', 'Not found', 404);
    setEtag(res, decision.updatedAt);
    res.json({ decision });
  } catch (e) { next(e); }
});

const patchSchema = z.object({ title: z.string().optional(), factors: factorsSchema.optional(), chosenOption: z.string().optional(), status: z.enum(['pending', 'decided']).optional() });
router.patch('/decisions/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const decision = await Decision.findOne({ _id: req.params.id, userId: req.userId });
    if (!decision) throw new ApiError('NOT_FOUND', 'Not found', 404);
    if (!checkIfMatch(req, decision.updatedAt)) throw new ApiError('PRECONDITION_FAILED', 'ETag mismatch', 412);
    const body = patchSchema.parse(req.body);
    Object.assign(decision, body);
    await decision.save();
    res.json({ decision });
  } catch (e) { next(e); }
});

router.delete('/decisions/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const decision = await Decision.findOne({ _id: req.params.id, userId: req.userId });
    if (!decision) throw new ApiError('NOT_FOUND', 'Not found', 404);
    if (!checkIfMatch(req, decision.updatedAt)) throw new ApiError('PRECONDITION_FAILED', 'ETag mismatch', 412);
    await Decision.deleteOne({ _id: decision._id });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
