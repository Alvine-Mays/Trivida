import { Router } from 'express';
import { requireCronKey } from '../middleware/cron.js';
import { SavingsPlan } from '../models/SavingsPlan.js';
import { User } from '../models/User.js';
import { sendExpoPush } from '../services/expo.js';
import { config } from '../config.js';
import { ExchangeRateCache } from '../models/ExchangeRateCache.js';

const router = Router();

router.post('/cron/savings/reminders', requireCronKey, async (_req, res, next) => {
  try {
    const userIds = await SavingsPlan.distinct('userId', { autoRemind: true });
    const users = await User.find({ _id: { $in: userIds } });
    let sent = 0;
    for (const u of users) {
      if (!u.expoPushTokens?.length) continue;
      const result = await sendExpoPush(u.expoPushTokens.map(t => ({ to: t, body: "N'oublie pas d'épargner aujourd'hui" })));
      sent += result.tickets.length;
    }
    res.status(202).json({ status: 'accepted', sent });
  } catch (e) { next(e); }
});

router.post('/cron/budget/alerts', requireCronKey, async (_req, res, next) => {
  try {
    const users = await User.find({ expoPushTokens: { $exists: true, $ne: [] } });
    let sent = 0;
    for (const u of users) {
      const result = await sendExpoPush(u.expoPushTokens.map(t => ({ to: t, body: 'Alerte budget: vérifie tes dépenses récentes' })));
      sent += result.tickets.length;
    }
    res.status(202).json({ status: 'accepted', sent });
  } catch (e) { next(e); }
});

router.post('/cron/fx/warm', requireCronKey, async (_req, res, next) => {
  try {
    const base = config.baseCurrency || 'XAF';
    const targets = ['USD','EUR'];
    const url = `${config.fx.baseUrl}/latest?base=${encodeURIComponent(base)}&symbols=${targets.join(',')}`;
    const r = await fetch(url);
    const j: any = await r.json();
    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + config.fx.ttlHours * 3600 * 1000);
    for (const k of Object.keys(j.rates || {})) {
      await ExchangeRateCache.findOneAndUpdate({ base, target: k }, { base, target: k, rate: Number(j.rates[k]), fetchedAt, expiresAt }, { upsert: true });
    }
    res.status(202).json({ status: 'accepted', warmed: Object.keys(j.rates || {}).length });
  } catch (e) { next(e); }
});

router.post('/cron/trial/notify', requireCronKey, async (_req, res, next) => {
  try {
    const now = new Date();
    function dayRange(daysAhead: number) {
      const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      target.setUTCDate(target.getUTCDate() + daysAhead);
      const start = new Date(target);
      const end = new Date(target);
      end.setUTCHours(23,59,59,999);
      return { start, end };
    }
    const windows = [7,3,1].map(dayRange);
    let sent = 0;
    for (const w of windows) {
      const users = await User.find({ plan: 'trial', trialEndsAt: { $gte: w.start, $lte: w.end }, expoPushTokens: { $exists: true, $ne: [] } });
      for (const u of users) {
        const daysLeft = Math.round((u.trialEndsAt!.getTime() - now.getTime()) / (24*3600*1000));
        const body = daysLeft > 1 ? `Ton essai expire dans ${daysLeft} jours. Passe à Premium pour tout débloquer.` : `Ton essai expire demain. Passe à Premium pour tout débloquer.`;
        const result = await sendExpoPush(u.expoPushTokens.map(t => ({ to: t, body })));
        sent += result.tickets.length;
      }
    }
    res.status(202).json({ status: 'accepted', sent });
  } catch (e) { next(e); }
});

export default router;
