import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { signTokens, verifyRefresh } from '../utils/jwt.js';
import { ApiError } from '../utils/errors.js';
import { config } from '../config.js';
import { verifyGoogleIdToken, verifyAppleIdToken } from '../services/oauth.js';
import { findOrCreateOAuthUser } from '../services/users.js';

const router = Router();
import rateLimit from 'express-rate-limit';
const authLimiter = rateLimit({ windowMs: 60_000, max: 20 });
router.use(['/register','/login','/refresh'], authLimiter);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  name: z.string().optional(),
  locale: z.enum(['fr', 'en']).optional(),
  currency: z.string().optional(),
});

router.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: body.email });
    if (existing) throw new ApiError('CONFLICT', 'Email already registered', 409);
    const passwordHash = await bcrypt.hash(body.password, config.bcryptRounds);
    const user = await User.create({ email: body.email, passwordHash, name: body.name, locale: body.locale || 'fr', currency: body.currency || 'XAF' });
    const tk = signTokens(String(user._id));
    const refreshHash = await bcrypt.hash(tk.refreshToken, config.bcryptRounds);
    const expiresAt = new Date(tk.refreshTokenExpiresAt);
    await Session.create({ userId: user._id, jti: tk.jti, refreshTokenHash: refreshHash, expiresAt });
    res.status(201).json({ user, tokens: tk });
  } catch (e) { next(e); }
});

const loginSchema = z.object({ email: z.string().email(), password: z.string() });
router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({ email: body.email });
    if (!user || !user.passwordHash) throw new ApiError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw new ApiError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
    const tk = signTokens(String(user._id));
    const refreshHash = await bcrypt.hash(tk.refreshToken, config.bcryptRounds);
    const expiresAt = new Date(tk.refreshTokenExpiresAt);
    await Session.create({ userId: user._id, jti: tk.jti, refreshTokenHash: refreshHash, expiresAt });
    res.json({ user, tokens: tk });
  } catch (e) { next(e); }
});

const oauthSchema = z.object({ idToken: z.string().min(10) });
router.post('/oauth/google', async (req, res, next) => {
  try {
    const body = oauthSchema.parse(req.body);
    const profile = await verifyGoogleIdToken(body.idToken);
    const user = await findOrCreateOAuthUser('google', profile.sub, profile.email);
    const tk = signTokens(String(user._id));
    const refreshHash = await bcrypt.hash(tk.refreshToken, config.bcryptRounds);
    const expiresAt = new Date(tk.refreshTokenExpiresAt);
    await Session.create({ userId: user._id, jti: tk.jti, refreshTokenHash: refreshHash, expiresAt });
    res.json({ user, tokens: tk });
  } catch (e) { next(e); }
});

router.post('/oauth/apple', async (req, res, next) => {
  try {
    const body = oauthSchema.parse(req.body);
    const profile = await verifyAppleIdToken(body.idToken);
    const user = await findOrCreateOAuthUser('apple', profile.sub, profile.email);
    const tk = signTokens(String(user._id));
    const refreshHash = await bcrypt.hash(tk.refreshToken, config.bcryptRounds);
    const expiresAt = new Date(tk.refreshTokenExpiresAt);
    await Session.create({ userId: user._id, jti: tk.jti, refreshTokenHash: refreshHash, expiresAt });
    res.json({ user, tokens: tk });
  } catch (e) { next(e); }
});

const refreshSchema = z.object({ refreshToken: z.string().min(20) });
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const payload = verifyRefresh(refreshToken);
    const session = await Session.findOne({ jti: payload.jti, userId: payload.sub });
    if (!session || session.revoked) throw new ApiError('SESSION_REVOKED', 'Session revoked', 401);
    const ok = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!ok) throw new ApiError('INVALID_CREDENTIALS', 'Invalid refresh', 401);
    await Session.updateOne({ _id: session._id }, { $set: { revoked: true } });
    const tk = signTokens(String(payload.sub));
    const refreshHash = await bcrypt.hash(tk.refreshToken, config.bcryptRounds);
    const expiresAt = new Date(tk.refreshTokenExpiresAt);
    await Session.create({ userId: payload.sub, jti: tk.jti, refreshTokenHash: refreshHash, expiresAt, replacedByJti: tk.jti });
    res.json({ tokens: tk });
  } catch (e) { next(e); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const t = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!t) throw new ApiError('UNAUTHENTICATED', 'Missing token', 401);
    const { sub } = (await import('../utils/jwt.js')).verifyAccess(t);
    await Session.updateMany({ userId: sub }, { $set: { revoked: true } });
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get('/me', async (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const t = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!t) throw new ApiError('UNAUTHENTICATED', 'Missing token', 401);
    const { sub } = (await import('../utils/jwt.js')).verifyAccess(t);
    const user = await User.findById(sub);
    if (!user) throw new ApiError('NOT_FOUND', 'User not found', 404);
    res.json({ user });
  } catch (e) { next(e); }
});

export default router;
