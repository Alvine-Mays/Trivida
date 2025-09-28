import { User } from '../models/User.js';

export async function findOrCreateOAuthUser(provider: 'google' | 'apple', sub: string, email?: string) {
  const providerField = provider === 'google' ? 'providers.googleId' : 'providers.appleId';
  let user = email ? await User.findOne({ email }) : null;
  if (!user) user = await User.findOne({ [providerField]: sub } as any);
  if (!user) {
    const placeholder = email || `${provider}_${sub}@placeholder.local`;
    user = await User.create({ email: placeholder, providers: provider === 'google' ? { googleId: sub } : { appleId: sub }, locale: 'fr', currency: 'XAF' });
  } else {
    if (provider === 'google' && user.providers?.googleId !== sub) user.providers = { ...(user.providers || {}), googleId: sub };
    if (provider === 'apple' && user.providers?.appleId !== sub) user.providers = { ...(user.providers || {}), appleId: sub };
    await user.save();
  }
  return user;
}
