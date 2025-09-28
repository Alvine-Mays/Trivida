import { Router } from 'express';
import { z } from 'zod';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import { AuthedRequest, requireAuth } from '../middleware/auth.js';
import { PaymentIntent } from '../models/PaymentIntent.js';
import { config } from '../config.js';
import { ApiError } from '../utils/errors.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const checkoutSchema = z.object({ operator: z.enum(['mtn','airtel']), amount: z.number().int().positive() });

router.post('/billing/checkout', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = checkoutSchema.parse(req.body);
    const reference = `CK-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    res.json({ reference, operator: body.operator, amount: body.amount, currency: 'XAF', status: 'pending' });
  } catch (e) { next(e); }
});

const mmInitSchema = z.object({ amount: z.number().positive().optional(), currency: z.literal('XAF'), operator: z.enum(['MTN_MOMO_CG','AIRTEL_MONEY_CG']), phone: z.string().min(8).max(20) });

router.post('/billing/mobile-money/initiate', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = mmInitSchema.parse(req.body);
    const requestId = randomUUID();
    const expected = config.premium.monthlyPriceXAF;
    if (body.amount !== undefined && body.amount !== expected) return res.status(400).json({ code: 'BAD_REQUEST', message: `Price mismatch. Expected ${expected} XAF/month` });
    await PaymentIntent.create({ requestId, userId: req.userId!, amount: expected, currency: body.currency, operator: body.operator, msisdn: body.phone, status: 'INITIATED', provider: 'legacy_mobile_money' });
    res.status(201).json({ requestId, status: 'pending', amount: expected, currency: body.currency });
  } catch (e) { next(e); }
});

const statusSchema = z.object({ requestId: z.string().uuid() });
router.get('/billing/mobile-money/status/:requestId', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { requestId } = statusSchema.parse(req.params);
    const pi = await PaymentIntent.findOne({ requestId, userId: req.userId });
    if (!pi) return res.status(404).json({ code: 'NOT_FOUND', message: 'Unknown requestId' });
    res.json({ requestId, status: pi.status, operatorTransactionId: pi.operatorTransactionId });
  } catch (e) { next(e); }
});


const subInitSchema = z.object({ months: z.number().int().min(1).max(24), network: z.enum(['MTN','AIRTEL']).optional(), phone: z.string().min(8).max(20) });
router.post('/billing/subscriptions/initiate', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { months, network, phone } = subInitSchema.parse(req.body);
    const price = config.premium.monthlyPriceXAF;
    const discount = months >= 12 ? 0.15 : months >= 3 ? 0.05 : 0;
    const gross = months * price;
    const amount = Math.round(gross * (1 - discount));
    const requestId = randomUUID();
    const basePi = { requestId, userId: req.userId!, amount, currency: 'XAF', provider: 'cinetpay', network, operator: 'CINETPAY', msisdn: phone, months, discountPercent: Math.round(discount * 100), status: 'INITIATED' as const };

    let paymentUrl: string | undefined;
    if (!config.cinetpay.apiKey || !config.cinetpay.siteId) {
      await PaymentIntent.create(basePi);
      return res.status(201).json({ requestId, status: 'pending', amount, currency: 'XAF', months, discountPercent: Math.round(discount * 100) });
    }

    // Créer un lien de paiement CinetPay
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const notifyUrl = config.cinetpay.notifyUrl || (config.publicBaseUrl ? `${config.publicBaseUrl}/billing/cinetpay/webhook` : undefined);
    const payload: any = {
      apikey: config.cinetpay.apiKey,
      site_id: config.cinetpay.siteId,
      transaction_id: requestId,
      amount,
      currency: 'XAF',
      description: `Trivida Premium ${months} mois`,
      channels: 'MOBILE_MONEY',
      notify_url: notifyUrl,
      return_url: config.cinetpay.returnUrl || notifyUrl,
      customer_phone_number: phone,
      metadata: JSON.stringify({ months, discountPercent: Math.round(discount * 100), network }),
    };
    const r = await fetch(`${config.cinetpay.baseUrl}/payment`, { method: 'POST', headers, body: JSON.stringify(payload) });
    const j: any = await r.json().catch(() => ({}));
    const ok = (j?.code === '201' || j?.code === 201) && j?.data?.payment_url;
    if (!ok) throw new ApiError('CONFLICT', 'CinetPay init failed', r.status || 500);
    paymentUrl = j?.data?.payment_url;
    await PaymentIntent.create({ ...basePi, providerRef: j?.data?.payment_token ? String(j.data.payment_token) : undefined, providerLink: paymentUrl });
    res.status(201).json({ requestId, status: 'pending', amount, currency: 'XAF', months, discountPercent: Math.round(discount * 100), paymentUrl });
  } catch (e) { next(e); }
});

const webhookLimiter = rateLimit({ windowMs: 60_000, max: 60 });

function ipAllowlist(req: any, res: any, next: any) {
  const list = (process.env.CINETPAY_IP_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!list.length) return next();
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
  if (list.includes(ip)) return next();
  return res.status(403).json({ code: 'FORBIDDEN', message: 'IP not allowed' });
}

router.post('/billing/cinetpay/webhook', webhookLimiter, ipAllowlist, async (req, res) => {
  try {
    const body: any = req.body || {};
    const txRef = body?.transaction_id || body?.transactionId || body?.cpm_trans_id;
    if (!txRef) return res.status(400).json({ code: 'BAD_REQUEST', message: 'Missing transaction_id' });

    let mapped: 'SUCCESS'|'FAILED'|'PENDING' = 'PENDING';
    // Sandbox: si CINETPAY_SANDBOX_MODE=1, on se fie au body.status (ACCEPTED/REFUSED)
    if (process.env.CINETPAY_SANDBOX_MODE === '1') {
      const stBody = String(body?.status || body?.cpm_result || '').toUpperCase();
      mapped = stBody === 'ACCEPTED' ? 'SUCCESS' : stBody === 'REFUSED' ? 'FAILED' : 'PENDING';
    } else if (config.cinetpay.apiKey && config.cinetpay.siteId) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const payload = { apikey: config.cinetpay.apiKey, site_id: config.cinetpay.siteId, transaction_id: txRef } as any;
      const r = await fetch(`${config.cinetpay.baseUrl}/payment/check`, { method: 'POST', headers, body: JSON.stringify(payload) });
      const j: any = await r.json().catch(() => ({}));
      const st = String(j?.data?.transaction?.status || j?.data?.status || j?.data?.payment_status || '').toUpperCase();
      mapped = st === 'ACCEPTED' ? 'SUCCESS' : st === 'REFUSED' ? 'FAILED' : 'PENDING';
    }

    const pi = await PaymentIntent.findOneAndUpdate({ requestId: txRef }, { $set: { status: mapped } }, { new: true });
    if (pi && mapped === 'SUCCESS') {
      const months = pi.months || 1;
      const { User } = await import('../models/User.js');
      const { Receipt } = await import('../models/Receipt.js');
      const now = new Date();
      const base = pi?.userId ? await User.findById(pi.userId) : null;
      const start = base?.premiumUntil && base.premiumUntil > now ? base.premiumUntil : now;
      const until = new Date(start.getTime());
      until.setMonth(until.getMonth() + months);
      await User.updateOne({ _id: pi.userId }, { $set: { plan: 'premium', premiumUntil: until } });
      const existing = await Receipt.findOne({ paymentIntentId: pi._id });
      if (!existing) {
        const unitPrice = Math.round((pi.amount || 0) / months);
        const receiptNumber = `RCT-${pi.requestId}`;
        await Receipt.create({ paymentIntentId: pi._id, userId: pi.userId, receiptNumber, amount: pi.amount, currency: pi.currency, months, unitPrice, discountPercent: pi.discountPercent || 0, network: pi.network, msisdn: pi.msisdn, provider: pi.provider, providerRef: pi.providerRef });
      }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Webhook error' });
  }
});

import PDFDocument from 'pdfkit';
import { Receipt } from '../models/Receipt.js';

const receiptIdSchema = z.object({ id: z.string() });

router.get('/billing/receipts/:id.csv', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { id } = receiptIdSchema.parse(req.params);
    const r = await Receipt.findOne({ _id: id, userId: req.userId });
    if (!r) return res.status(404).json({ code: 'NOT_FOUND', message: 'Receipt not found' });
    const rows = [
      ['receiptNumber','issuedAt','amount','currency','months','unitPrice','discountPercent','network','msisdn','provider','providerRef'],
      [r.receiptNumber, r.issuedAt.toISOString(), String(r.amount), r.currency, String(r.months), String(r.unitPrice), String(r.discountPercent), r.network || '', r.msisdn || '', r.provider || '', r.providerRef || ''],
    ];
    const csv = rows.map(rr => rr.map(v => String(v).includes(',') ? `"${String(v).replace(/"/g,'""')}"` : String(v)).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${r.receiptNumber}.csv"`);
    res.send(csv);
  } catch (e) { next(e); }
});

router.get('/billing/receipts/:id.pdf', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { id } = receiptIdSchema.parse(req.params);
    const r = await Receipt.findOne({ _id: id, userId: req.userId });
    if (!r) return res.status(404).json({ code: 'NOT_FOUND', message: 'Receipt not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${r.receiptNumber}.pdf"`);
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);
    doc.fontSize(18).text('Reçu de paiement', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Numéro: ${r.receiptNumber}`);
    doc.text(`Date: ${r.issuedAt.toISOString().slice(0,10)}`);
    doc.text(`Montant: ${r.amount} ${r.currency}`);
    doc.text(`Durée: ${r.months} mois`);
    if (r.discountPercent) doc.text(`Remise: ${r.discountPercent}%`);
    doc.text(`Réseau: ${r.network || '-'}`);
    doc.text(`Téléphone: ${r.msisdn || '-'}`);
    doc.text(`Fournisseur: ${r.provider || 'CinetPay'}`);
    if (r.providerRef) doc.text(`Réf. fournisseur: ${r.providerRef}`);
    doc.moveDown();
    doc.text('Merci pour votre abonnement à Trivida Premium.');
    doc.end();
  } catch (e) { next(e); }
});

// Lister les reçus de l'utilisateur
const listSchema = z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) });
router.get('/billing/receipts', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { limit } = listSchema.parse({ limit: req.query.limit || 10 });
    const items = await Receipt.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(limit);
    res.json({ items });
  } catch (e) { next(e); }
});

export default router;
