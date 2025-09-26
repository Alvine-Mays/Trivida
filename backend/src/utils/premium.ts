import { UserDoc } from '../models/User.js';

export function isPremium(user: UserDoc) {
  const now = new Date();
  if (user.trialEndsAt && user.trialEndsAt > now) return true;
  if (user.premiumUntil && user.premiumUntil > now) return true;
  return false;
}

export function isBoosted(user: UserDoc) {
  const now = new Date();
  if (user.premiumUntil && user.premiumUntil > now) return true;
  if (user.plan === 'premium') return true;
  return false;
}

export function ensurePremiumOrPoints(user: UserDoc, minPoints: number) {
  if (isPremium(user)) return { ok: true } as const;
  if ((user.points || 0) >= minPoints) return { ok: true, consume: minPoints } as const;
  return { ok: false } as const;
}
