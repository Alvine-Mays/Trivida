import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Event } from '../models/Event.js';
import { Invitee } from '../models/Invitee.js';
import { ApiError } from '../utils/errors.js';

const router = Router();

router.get('/public/events/:slug', async (req, res, next) => {
  try {
    const ev = await Event.findOne({ slug: req.params.slug });
    if (!ev) throw new ApiError('NOT_FOUND', 'Not found', 404);
    if (ev.visibility === 'private') {
      const accessCode = String(req.query.accessCode || '');
      if (!accessCode || !ev.accessCodeHash || !(await bcrypt.compare(accessCode, ev.accessCodeHash))) throw new ApiError('FORBIDDEN', 'Forbidden', 403);
    }
    res.json(ev);
  } catch (e) { next(e); }
});

const rsvpSchema = z.object({ name: z.string(), email: z.string().optional(), phone: z.string().optional(), status: z.enum(['yes','no','maybe']).default('yes'), plusOnes: z.number().int().min(0).default(0), accessCode: z.string().optional() });
router.post('/public/events/:slug/rsvp', async (req, res, next) => {
  try {
    const body = rsvpSchema.parse(req.body);
    const ev = await Event.findOne({ slug: req.params.slug });
    if (!ev) throw new ApiError('NOT_FOUND', 'Not found', 404);
    if (ev.visibility === 'private') {
      if (!body.accessCode || !ev.accessCodeHash || !(await bcrypt.compare(body.accessCode, ev.accessCodeHash))) throw new ApiError('FORBIDDEN', 'Forbidden', 403);
    }
    let invitee = await Invitee.findOne({ eventId: ev._id, name: body.name });
    if (!invitee) invitee = await Invitee.create({ eventId: ev._id, name: body.name, email: body.email, phone: body.phone, status: body.status, plusOnes: body.plusOnes });
    else {
      invitee.status = body.status;
      invitee.plusOnes = body.plusOnes;
      invitee.email = body.email || invitee.email;
      invitee.phone = body.phone || invitee.phone;
      await invitee.save();
    }
    // award points to organizer (premium-only; boosted during premium)
    const { User } = await import('../models/User.js');
    const u = await User.findById(ev.userId);
    if (u && (await import('../utils/premium.js')).isPremium(u)) {
      const inc = (await import('../utils/premium.js')).isBoosted(u) ? 10 : 1;
      await User.updateOne({ _id: ev.userId }, { $inc: { points: inc } });
    }
    res.status(201).json(invitee);
  } catch (e) { next(e); }
});

export default router;
