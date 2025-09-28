import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireAuth, AuthedRequest } from '../middleware/auth.js';
import { Event } from '../models/Event.js';
import { Invitee } from '../models/Invitee.js';
import { ApiError } from '../utils/errors.js';
import { uniqueSlug } from '../utils/slug.js';
import { checkIfMatch, setEtag } from '../utils/etag.js';

const router = Router();

const createSchema = z.object({ title: z.string(), dateTime: z.string().datetime(), timeZone: z.string().optional(), location: z.string().optional(), visibility: z.enum(['public','private']), accessCode: z.string().optional(), costPerGuestMinor: z.number().int(), currency: z.string().default('XAF'), allowPlusOnes: z.boolean().default(true), capacity: z.number().int().optional() });
router.post('/events', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const slug = await uniqueSlug(Event, body.title);
    const accessCodeHash = body.visibility === 'private' && body.accessCode ? await bcrypt.hash(body.accessCode, 12) : undefined;
    const event = await Event.create({ userId: req.userId, title: body.title, dateTime: new Date(body.dateTime), timeZone: body.timeZone, location: body.location, visibility: body.visibility, accessCodeHash, slug, costPerGuestMinor: body.costPerGuestMinor, currency: body.currency, allowPlusOnes: body.allowPlusOnes, capacity: body.capacity });
    res.status(201).json(event);
  } catch (e) { next(e); }
});

router.get('/events', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const items = await Event.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) { next(e); }
});

router.get('/events/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const ev = await Event.findOne({ _id: req.params.id, userId: req.userId });
    if (!ev) throw new ApiError('NOT_FOUND', 'Not found', 404);
    setEtag(res, ev.updatedAt);
    res.json(ev);
  } catch (e) { next(e); }
});

const patchSchema = createSchema.partial();
router.patch('/events/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const ev = await Event.findOne({ _id: req.params.id, userId: req.userId });
    if (!ev) throw new ApiError('NOT_FOUND', 'Not found', 404);
    if (!checkIfMatch(req, ev.updatedAt)) throw new ApiError('PRECONDITION_FAILED', 'ETag mismatch', 412);
    const body = patchSchema.parse(req.body);
    Object.assign(ev, { ...body, dateTime: body.dateTime ? new Date(body.dateTime) : ev.dateTime });
    if (body.visibility === 'private' && body.accessCode) ev.accessCodeHash = await bcrypt.hash(body.accessCode, 12);
    await ev.save();
    res.json(ev);
  } catch (e) { next(e); }
});

router.delete('/events/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const ev = await Event.findOne({ _id: req.params.id, userId: req.userId });
    if (!ev) throw new ApiError('NOT_FOUND', 'Not found', 404);
    if (!checkIfMatch(req, ev.updatedAt)) throw new ApiError('PRECONDITION_FAILED', 'ETag mismatch', 412);
    await Event.deleteOne({ _id: ev._id });
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get('/events/:id/budget', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const ev = await Event.findOne({ _id: req.params.id, userId: req.userId });
    if (!ev) throw new ApiError('NOT_FOUND', 'Not found', 404);
    const yes = await Invitee.find({ eventId: ev._id, status: 'yes' });
    const yesCount = yes.length;
    const plusOnesYes = yes.reduce((s, i) => s + (i.plusOnes || 0), 0);
    const actualBudgetMinor = ev.costPerGuestMinor * (yesCount + plusOnesYes);
    res.json({ actualBudgetMinor, currency: ev.currency, yesCount, plusOnesYes });
  } catch (e) { next(e); }
});

const invSchema = z.object({ name: z.string(), email: z.string().optional(), phone: z.string().optional(), status: z.enum(['pending', 'yes', 'no', 'maybe']).optional(), plusOnes: z.number().int().min(0).default(0) });
router.get('/events/:eventId/invitees', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const items = await Invitee.find({ eventId: req.params.eventId });
    res.json({ items });
  } catch (e) { next(e); }
});
router.post('/events/:eventId/invitees', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = invSchema.parse(req.body);
    const created = await Invitee.create({ eventId: req.params.eventId, ...body });
    res.status(201).json({ invitee: created });
  } catch (e) { next(e); }
});
router.patch('/invitees/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = invSchema.partial().parse(req.body);
    const updated = await Invitee.findOneAndUpdate({ _id: req.params.id }, body, { new: true });
    if (!updated) throw new ApiError('NOT_FOUND', 'Not found', 404);
    res.json({ invitee: updated });
  } catch (e) { next(e); }
});
router.delete('/invitees/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    await Invitee.deleteOne({ _id: req.params.id });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
