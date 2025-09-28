import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import { Business } from '../models/Business.js';
import { FinanceCategory } from '../models/FinanceCategory.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/errors.js';
import { getRates } from '../services/fx.js';
import { convertMinor } from '../utils/currency.js';

const router = Router();

const bizSchema = z.object({ name: z.string(), description: z.string().optional(), currency: z.string().default('XAF') });

router.get('/finance/businesses', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const items = await Business.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) { next(e); }
});

router.post('/finance/businesses', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = bizSchema.parse(req.body);
    const created = await Business.create({ userId: req.userId, ...body });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

router.get('/finance/businesses/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const biz = await Business.findOne({ _id: req.params.id, userId: req.userId });
    if (!biz) throw new ApiError('NOT_FOUND', 'Not found', 404);
    res.json(biz);
  } catch (e) { next(e); }
});

router.patch('/finance/businesses/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = bizSchema.partial().parse(req.body);
    const updated = await Business.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, body, { new: true });
    if (!updated) throw new ApiError('NOT_FOUND', 'Not found', 404);
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/finance/businesses/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const biz = await Business.findOne({ _id: req.params.id, userId: req.userId });
    if (!biz) throw new ApiError('NOT_FOUND', 'Not found', 404);
    const anyCat = await FinanceCategory.exists({ userId: req.userId, businessId: biz._id });
    const anyTx = await Transaction.exists({ userId: req.userId, businessId: biz._id });
    if (anyCat || anyTx) throw new ApiError('CONFLICT', 'Business has related data', 409);
    await Business.deleteOne({ _id: biz._id });
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get('/finance/businesses/:id/summary', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const biz = await Business.findOne({ _id: req.params.id, userId: req.userId });
    if (!biz) throw new ApiError('NOT_FOUND', 'Not found', 404);
    const baseCurrency = String(req.query.baseCurrency || biz.currency || 'XAF').toUpperCase();
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const period = (req.query.period as 'weekly'|'monthly'|undefined);

    const match: any = { userId: req.userId, businessId: biz._id };
    if (from) match.date = { ...(match.date || {}), $gte: from };
    if (to) match.date = { ...(match.date || {}), $lte: to };

    const txs = await Transaction.find(match).select('categoryId amountMinor currency date').lean();
    const catIds = Array.from(new Set(txs.map(t => String(t.categoryId))));
    const cats = await FinanceCategory.find({ _id: { $in: catIds } }).select('type').lean();
    const catType = new Map(cats.map(c => [String(c._id), c.type as string]));

    const currencies = Array.from(new Set(txs.map(t => t.currency.toUpperCase())));
    const others = currencies.filter(c => c !== baseCurrency);
    const ratesBaseToOthers = others.length ? await getRates(baseCurrency, others) : {};

    let income = 0, expense = 0;
    const timeline = new Map<string, { income: number; expense: number }>();

    function periodKey(d: Date) {
      const dd = new Date(d);
      if (period === 'weekly') {
        const day = dd.getUTCDay();
        const diff = (day + 6) % 7;
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
      let amount = t.amountMinor;
      if (cur !== baseCurrency) {
        const r = ratesBaseToOthers[cur];
        if (r && r > 0) amount = convertMinor(t.amountMinor, cur, baseCurrency, 1 / r);
      }
      const type = (catType.get(String(t.categoryId)) || 'expense');
      if (type === 'income') income += amount; else if (type === 'expense') expense += amount;
      if (period) {
        const key = periodKey(new Date((t as any).date));
        if (key) {
          const agg = timeline.get(key) || { income: 0, expense: 0 };
          if (type === 'income') agg.income += amount; else if (type === 'expense') agg.expense += amount;
          timeline.set(key, agg);
        }
      }
    }

    const net = income - expense;
    const timelineArr = Array.from(timeline.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([periodStart, v]) => ({ periodStart, income: v.income, expense: v.expense, net: v.income - v.expense }));
    res.json({ baseCurrency, income, expense, net, timeline: timelineArr });
  } catch (e) { next(e); }
});

import { ensurePremiumOrPoints } from '../utils/premium.js';

router.get('/finance/businesses/:id/report', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { User } = await import('../models/User.js');
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError('UNAUTHENTICATED', 'User not found', 401);
    const gate = ensurePremiumOrPoints(user, 50);
    const usePoints = String(req.query.usePoints || '') === '1';
    if (!gate.ok) throw new ApiError('FORBIDDEN', 'Premium required', 403);

    const biz = await Business.findOne({ _id: req.params.id, userId: req.userId });
    if (!biz) throw new ApiError('NOT_FOUND', 'Not found', 404);
    const baseCurrency = String(req.query.baseCurrency || biz.currency || 'XAF').toUpperCase();
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const period = (req.query.period as 'weekly'|'monthly'|undefined);

    const match: any = { userId: req.userId, businessId: biz._id };
    if (from) match.date = { ...(match.date || {}), $gte: from };
    if (to) match.date = { ...(match.date || {}), $lte: to };

    const txs = await Transaction.find(match).select('categoryId amountMinor currency date').lean();
    const catIds = Array.from(new Set(txs.map(t => String(t.categoryId))));
    const cats = await FinanceCategory.find({ _id: { $in: catIds } }).select('type name').lean();
    const catInfo = new Map(cats.map(c => [String(c._id), { type: c.type as string, name: c.name as string }]));

    const currencies = Array.from(new Set(txs.map(t => t.currency.toUpperCase())));
    const others = currencies.filter(c => c !== baseCurrency);
    const ratesBaseToOthers = others.length ? await (await import('../services/fx.js')).getRates(baseCurrency, others) : {};

    const byPeriod: Record<string, { income: number; expense: number; savings: number; byCategory: Record<string, number> }> = {};
    function periodKey(d: Date) {
      const dd = new Date(d);
      if (period === 'weekly') {
        const day = dd.getUTCDay();
        const diff = (day + 6) % 7;
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
      return new Date(d).toISOString().slice(0,10);
    }

    for (const t of txs) {
      const cur = t.currency.toUpperCase();
      let amount = t.amountMinor;
      if (cur !== baseCurrency) {
        const r = (ratesBaseToOthers as any)[cur];
        if (r && r > 0) amount = (await import('../utils/currency.js')).convertMinor(t.amountMinor, cur, baseCurrency, 1 / r);
      }
      const k = periodKey(new Date((t as any).date));
      const c = byPeriod[k] || { income: 0, expense: 0, savings: 0, byCategory: {} };
      const info = catInfo.get(String(t.categoryId)) || { type: 'expense', name: String(t.categoryId).slice(-6) };
      if (info.type === 'income') c.income += amount; else if (info.type === 'expense') c.expense += amount; else c.savings += amount;
      c.byCategory[info.name] = (c.byCategory[info.name] || 0) + amount;
      byPeriod[k] = c;
    }

    const report = Object.entries(byPeriod).sort(([a],[b]) => a.localeCompare(b)).map(([periodStart, v]) => ({ periodStart, income: v.income, expense: v.expense, savings: v.savings, net: v.income - v.expense, byCategory: v.byCategory }));

    // Points consumption disabled in free mode; no-op unless future premium-only consumption is defined
    res.json({ baseCurrency, report });
  } catch (e) { next(e); }
});

router.get('/finance/businesses/:id/export.csv', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { User } = await import('../models/User.js');
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError('UNAUTHENTICATED', 'User not found', 401);
    const gate = ensurePremiumOrPoints(user, 50);
    const usePoints = String(req.query.usePoints || '') === '1';
    if (!gate.ok) throw new ApiError('FORBIDDEN', 'Premium required', 403);

    const biz = await Business.findOne({ _id: req.params.id, userId: req.userId });
    if (!biz) throw new ApiError('NOT_FOUND', 'Not found', 404);
    const baseCurrency = String(req.query.baseCurrency || biz.currency || 'XAF').toUpperCase();
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const match: any = { userId: req.userId, businessId: biz._id };
    if (from) match.date = { ...(match.date || {}), $gte: from };
    if (to) match.date = { ...(match.date || {}), $lte: to };

    const txs = await Transaction.find(match).sort({ date: -1 });
    const currencies = Array.from(new Set(txs.map(t => t.currency.toUpperCase())));
    const others = currencies.filter(c => c !== baseCurrency);
    const ratesBaseToOthers = others.length ? await (await import('../services/fx.js')).getRates(baseCurrency, others) : {};

    const rows = [['date','categoryId','businessId','note','amountMinor','currency','amountInBaseMinor','baseCurrency']];
    for (const t of txs) {
      const cur = t.currency.toUpperCase();
      let amountInBaseMinor = t.amountMinor;
      if (cur !== baseCurrency) {
        const r = (ratesBaseToOthers as any)[cur];
        if (r && r > 0) amountInBaseMinor = (await import('../utils/currency.js')).convertMinor(t.amountMinor, cur, baseCurrency, 1 / r);
      }
      rows.push([t.date.toISOString(), String(t.categoryId), String(t.businessId || ''), t.note || '', String(t.amountMinor), cur, String(amountInBaseMinor), baseCurrency]);
    }
    const csv = rows.map(r => r.map(v => String(v).includes(',') ? `"${String(v).replace(/"/g,'""')}"` : String(v)).join(',')).join('\n');
    // Points consumption disabled in free mode; no-op unless future premium-only consumption is defined
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (e) { next(e); }
});

export default router;
