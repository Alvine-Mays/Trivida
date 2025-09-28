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


router.post('/cron/trial/reminders', requireCronKey, async (_req, res, next) => {
  try {
    const tz = 'Africa/Brazzaville';
    const now = new Date();
    await User.updateMany({ plan: 'trial', trialEndsAt: { $lte: now } }, { $set: { plan: 'free' } });
    const formatYmd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    const parseOffsetMinutes = (d: Date) => {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' }).formatToParts(d);
      const tzName = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0';
      const m = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
      const sign = (m?.[1] === '-' ? -1 : 1);
      const h = Number(m?.[2] || 0);
      const min = Number(m?.[3] || 0);
      return sign * (h * 60 + min);
    };
    const [baseYear, baseMonth, baseDay] = formatYmd(now).split('-').map(Number);
    const tzDayRange = (daysAhead: number) => {
      const probe = new Date(Date.UTC(baseYear, baseMonth - 1, baseDay + daysAhead, 12, 0, 0));
      const offsetMin = parseOffsetMinutes(probe);
      const startUtcMs = Date.UTC(baseYear, baseMonth - 1, baseDay + daysAhead, 0, 0, 0) - offsetMin * 60000;
      const endUtcMs = Date.UTC(baseYear, baseMonth - 1, baseDay + daysAhead, 23, 59, 59, 999) - offsetMin * 60000;
      return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
    };
    const ymdToday = formatYmd(now);
    const daysList = [7, 3, 1] as const;
    const candidates: Record<number, any[]> = { 7: [], 3: [], 1: [] };
    const missingTrialEndsAt: string[] = [];
    for (const d of daysList) {
      const { start, end } = tzDayRange(d);
      const usersWithTrial = await User.find({ plan: 'trial', trialEndsAt: { $gte: start, $lte: end } });
      usersWithTrial.forEach(u => candidates[d].push(u));
      const createdRangeStartDate = new Date(start.getTime() - 14 * 24 * 3600 * 1000);
      const createdRangeEndDate = new Date(end.getTime() - 14 * 24 * 3600 * 1000);
      const usersMissing = await User.find({ plan: 'trial', $or: [{ trialEndsAt: { $exists: false } }, { trialEndsAt: null }], createdAt: { $gte: createdRangeStartDate, $lte: createdRangeEndDate } });
      for (const u of usersMissing) { candidates[d].push(u); missingTrialEndsAt.push(String(u._id)); }
    }
    let sent = 0;
    let skippedNoToken = 0;
    const buildTexts = (daysLeft: number, locale: string | undefined) => {
      const ln = (locale === 'en' ? 'en' : 'fr');
      if (daysLeft === 7) return { title: ln === 'en' ? 'Your trial ends in 7 days' : 'Votre période d’essai se termine dans 7 jours', body: ln === 'en' ? 'Activate Trivida via Mobile Money to keep going.' : 'Activez Trivida via Mobile Money pour continuer.' };
      if (daysLeft === 3) return { title: ln === 'en' ? 'Only 3 days left in your trial' : 'Plus que 3 jours d’essai', body: ln === 'en' ? 'Activate Trivida via Mobile Money to keep going.' : 'Activez Trivida via Mobile Money pour continuer.' };
      return { title: ln === 'en' ? 'Final day of your trial' : 'Dernier jour d’essai', body: ln === 'en' ? 'Activate Trivida via Mobile Money to keep going.' : 'Activez Trivida via Mobile Money pour continuer.' };
    };
    for (const d of daysList) {
      for (const u of candidates[d]) {
        const tokens: string[] = u.expoPushTokens || [];
        if (!tokens.length) { skippedNoToken++; continue; }
        const sentMarker = u.trialRemindersSent?.[`d${d}`];
        const sentMarkerYmd = sentMarker ? formatYmd(new Date(sentMarker)) : null;
        if (sentMarkerYmd === ymdToday) continue;
        const texts = buildTexts(d, u.locale);
        const messages = tokens.map(t => ({ to: t, title: texts.title, body: texts.body, data: { screen: 'CheckoutMobileMoney', reason: 'trial', daysLeft: d } }));
        await sendExpoPush(messages);
        sent += messages.length;
        const update: any = {};
        update[`trialRemindersSent.d${d}`] = now;
        await User.updateOne({ _id: u._id }, { $set: update });
      }
    }
    res.status(202).json({ status: 'accepted', sent, skippedNoToken, missingTrialEndsAtCount: Array.from(new Set(missingTrialEndsAt)).length });
  } catch (e) { next(e); }
});

export default router;
