import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import { FinanceCategory } from '../models/FinanceCategory.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/errors.js';
import { getRates } from '../services/fx.js';
import { convertMinor } from '../utils/currency.js';
import { pagedList } from '../utils/pagination.js';
import { ensurePremiumOrPoints, isPremium } from '../utils/premium.js';

const router = Router();

const catSchema = z.object({ name: z.string(), type: z.enum(['expense', 'income', 'savings']), businessId: z.string().optional(), color: z.string().optional(), icon: z.string().optional() });
router.get('/finance/categories', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const cats = await FinanceCategory.find({ userId: req.userId }).sort({ name: 1 });
    res.json(cats);
  } catch (e) { next(e); }
});
router.post('/finance/categories', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = catSchema.parse(req.body);
    const { User } = await import('../models/User.js');
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError('UNAUTHENTICATED', 'User not found', 401);
    const count = await FinanceCategory.countDocuments({ userId: req.userId });
    const isTrial = user.trialEndsAt && user.trialEndsAt > new Date();
    const isPremium = (user.premiumUntil && user.premiumUntil > new Date()) || isTrial || user.plan === 'premium';
    const FREE_LIMIT = 10;
    if (!isPremium && count >= FREE_LIMIT) throw new ApiError('FORBIDDEN', 'Premium required for more categories', 403);
    const created = await FinanceCategory.create({ userId: req.userId, ...body });
    res.status(201).json(created);
  } catch (e) { next(e); }
});
router.get('/finance/categories/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const cat = await FinanceCategory.findOne({ _id: req.params.id, userId: req.userId });
    if (!cat) throw new ApiError('NOT_FOUND', 'Not found', 404);
    res.setHeader('ETag', String(cat.updatedAt.getTime()));
    res.json(cat);
  } catch (e) { next(e); }
});
router.patch('/finance/categories/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const existing = await FinanceCategory.findOne({ _id: req.params.id, userId: req.userId });
    if (!existing) throw new ApiError('NOT_FOUND', 'Not found', 404);
    const ifMatch = req.header('If-Match');
    if (ifMatch && ifMatch !== String(existing.updatedAt.getTime())) throw new ApiError('PRECONDITION_FAILED', 'ETag mismatch', 412);
    const body = catSchema.partial().parse(req.body);
    Object.assign(existing, body);
    await existing.save();
    res.json(existing);
  } catch (e) { next(e); }
});
router.delete('/finance/categories/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const existing = await FinanceCategory.findOne({ _id: req.params.id, userId: req.userId });
    if (!existing) throw new ApiError('NOT_FOUND', 'Not found', 404);
    const ifMatch = req.header('If-Match');
    if (ifMatch && ifMatch !== String(existing.updatedAt.getTime())) throw new ApiError('PRECONDITION_FAILED', 'ETag mismatch', 412);
    await FinanceCategory.deleteOne({ _id: existing._id });
    res.status(204).end();
  } catch (e) { next(e); }
});

const txSchema = z.object({ categoryId: z.string(), eventId: z.string().optional(), amountMinor: z.number().int(), currency: z.string().default('XAF'), date: z.string().datetime(), note: z.string().optional() });
router.get('/finance/transactions', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const limit = Math.min(100, Number(req.query.limit || 20));
    const filter: any = { userId: req.userId };
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    const { items, nextCursor } = await pagedList(Transaction, filter, limit, String(req.query.cursor || ''));
    res.json({ items, nextCursor });
  } catch (e) { next(e); }
});
router.post('/finance/transactions', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = txSchema.parse(req.body);
    const cat = await FinanceCategory.findOne({ _id: body.categoryId, userId: req.userId });
    if (!cat) throw new ApiError('NOT_FOUND', 'Category not found', 404);
    const created = await Transaction.create({ userId: req.userId, ...body, businessId: (cat as any).businessId, date: new Date(body.date) });
    // points (premium-only; boosted during premium)
    const { User } = await import('../models/User.js');
    const u = await User.findById(req.userId);
    if (u && (await import('../utils/premium.js')).isPremium(u)) {
      const inc = (await import('../utils/premium.js')).isBoosted(u) ? 10 : 1;
      await User.updateOne({ _id: req.userId }, { $inc: { points: inc } });
    }
    res.status(201).json(created);
  } catch (e) { next(e); }
});
router.get('/finance/transactions/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.userId });
    if (!tx) throw new ApiError('NOT_FOUND', 'Not found', 404);
    res.setHeader('ETag', String(tx.updatedAt.getTime()));
    res.json(tx);
  } catch (e) { next(e); }
});
router.patch('/finance/transactions/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const existing = await Transaction.findOne({ _id: req.params.id, userId: req.userId });
    if (!existing) throw new ApiError('NOT_FOUND', 'Not found', 404);
    const ifMatch = req.header('If-Match');
    if (ifMatch && ifMatch !== String(existing.updatedAt.getTime())) throw new ApiError('PRECONDITION_FAILED', 'ETag mismatch', 412);
    const body = txSchema.partial().parse(req.body);
    Object.assign(existing, { ...body, date: body.date ? new Date(body.date) : existing.date });
    await existing.save();
    res.json(existing);
  } catch (e) { next(e); }
});
router.delete('/finance/transactions/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const existing = await Transaction.findOne({ _id: req.params.id, userId: req.userId });
    if (!existing) throw new ApiError('NOT_FOUND', 'Not found', 404);
    const ifMatch = req.header('If-Match');
    if (ifMatch && ifMatch !== String(existing.updatedAt.getTime())) throw new ApiError('PRECONDITION_FAILED', 'ETag mismatch', 412);
    await Transaction.deleteOne({ _id: existing._id });
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get('/finance/summary', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const baseCurrency = String(req.query.baseCurrency || 'XAF').toUpperCase();
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const typeFilter = (req.query.type as string | undefined) as ('expense'|'income'|'savings'|undefined);
    const period = (req.query.period as 'weekly' | 'monthly' | undefined);
    const match: any = { userId: req.userId };
    if (from) match.date = { ...(match.date || {}), $gte: from };
    if (to) match.date = { ...(match.date || {}), $lte: to };
    const txs = await Transaction.find(match).select('categoryId amountMinor currency date').lean();
    const catIds = Array.from(new Set(txs.map(t => String(t.categoryId))));
    const cats = await FinanceCategory.find({ _id: { $in: catIds } }).select('type').lean();
    const catType = new Map(cats.map(c => [String(c._id), c.type as string]));
    const currencies = Array.from(new Set(txs.map(t => t.currency.toUpperCase())));
    const others = currencies.filter(c => c !== baseCurrency);
    const ratesBaseToOthers = others.length ? await getRates(baseCurrency, others) : {};
    const totalsByType: Record<string, number> = {};
    const totalsByCategory: { categoryId: string; amountMinor: number }[] = [];
    const totalsByCategoryFiltered: { categoryId: string; amountMinor: number }[] = [];
    const byCategory: Record<string, number> = {};
    const timeline = new Map<string, { expense: number; income: number; savings: number }>();

    function periodKey(d: Date) {
      const dd = new Date(d);
      if (period === 'weekly') {
        const day = dd.getUTCDay();
        const diff = (day + 6) % 7; // Monday start
        dd.setUTCDate(dd.getUTCDate() - diff);
        dd.setUTCHours(0,0,0,0);
        return dd.toISOString().slice(0,10);
      }
      if (period === 'monthly') {
        const y = dd.getUTCFullYear();
        const m = dd.getUTCMonth();
        const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        return start.toISOString().slice(0,10);
      }
      return '';
    }

    for (const t of txs) {
      const cur = t.currency.toUpperCase();
      let amountInBaseMinor = t.amountMinor;
      if (cur !== baseCurrency) {
        const r = ratesBaseToOthers[cur];
        if (r && r > 0) {
          const rateCurToBase = 1 / r;
          amountInBaseMinor = convertMinor(t.amountMinor, cur, baseCurrency, rateCurToBase);
        } else {
          amountInBaseMinor = t.amountMinor;
        }
      }
      const k = String(t.categoryId);
      byCategory[k] = (byCategory[k] || 0) + amountInBaseMinor;
      const type = (catType.get(k) || 'expense') as 'expense'|'income'|'savings';
      totalsByType[type] = (totalsByType[type] || 0) + amountInBaseMinor;

      if (period) {
        const key = periodKey(new Date((t as any).date));
        if (key) {
          const curAgg = timeline.get(key) || { expense: 0, income: 0, savings: 0 };
          curAgg[type] += amountInBaseMinor;
          timeline.set(key, curAgg);
        }
      }
    }
    for (const [categoryId, amountMinor] of Object.entries(byCategory)) {
      totalsByCategory.push({ categoryId, amountMinor });
      if (!typeFilter || catType.get(categoryId) === typeFilter) totalsByCategoryFiltered.push({ categoryId, amountMinor });
    }
    const timelineArr = Array.from(timeline.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([periodStart, v]) => ({ periodStart, totalsByType: v }));
    res.json({ baseCurrency, totalsByType, totalsByCategory, totalsByCategoryFiltered, timeline: timelineArr });
  } catch (e) { next(e); }
});

router.get('/finance/export.csv', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { User } = await import('../models/User.js');
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError('UNAUTHENTICATED', 'User not found', 401);
    const gate = ensurePremiumOrPoints(user, 50);
    const usePoints = String(req.query.usePoints || '') === '1';
    if (!gate.ok) throw new ApiError('FORBIDDEN', 'Premium required', 403);

    const baseCurrency = String(req.query.baseCurrency || 'XAF').toUpperCase();
    const txs = await Transaction.find({ userId: req.userId }).sort({ date: -1 });
    const currencies = Array.from(new Set(txs.map(t => t.currency.toUpperCase())));
    const others = currencies.filter(c => c !== baseCurrency);
    const ratesBaseToOthers = others.length ? await getRates(baseCurrency, others) : {};
    const rows = [['date','categoryId','note','amountMinor','currency','amountInBaseMinor','baseCurrency']];
    for (const t of txs) {
      const cur = t.currency.toUpperCase();
      let amountInBaseMinor = t.amountMinor;
      if (cur !== baseCurrency) {
        const r = ratesBaseToOthers[cur];
        if (r && r > 0) {
          const rateCurToBase = 1 / r;
          amountInBaseMinor = convertMinor(t.amountMinor, cur, baseCurrency, rateCurToBase);
        }
      }
      rows.push([
        t.date.toISOString(),
        String(t.categoryId),
        t.note || '',
        String(t.amountMinor),
        cur,
        String(amountInBaseMinor),
        baseCurrency,
      ]);
    }
    const csv = rows.map(r => r.map(v => String(v).includes(',') ? `"${String(v).replace(/"/g,'""')}"` : String(v)).join(',')).join('\n');
    // Points consumption disabled in free mode; no-op unless future premium-only consumption is defined
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (e) { next(e); }
});

export default router;
