import { UserDoc } from '../models/User.js';

export function isPremium(user: UserDoc) {
  const now = new Date();
  if (user.trialEndsAt && user.trialEndsAt > now) return true;
  if (user.premiumUntil && user.premiumUntil > now) return true;
  if ((user as any).plan === 'premium') return true;
  return false;
}

export function isBoosted(user: UserDoc) {
  const now = new Date();
  if (user.trialEndsAt && user.trialEndsAt > now) return true;
  if (user.premiumUntil && user.premiumUntil > now) return true;
  if ((user as any).plan === 'premium') return true;
  return false;
}

export function ensurePremiumOrPoints(_user: UserDoc, _minPoints: number) {
  // Points features are premium-only: do not allow fallback to points in free mode
  return { ok: isPremium(_user) } as const;
}
