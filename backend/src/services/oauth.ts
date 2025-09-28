import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config.js';

const googleJWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const appleJWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export type OAuthProfile = { sub: string; email?: string };

export async function verifyGoogleIdToken(idToken: string): Promise<OAuthProfile> {
  const audiences = [
    config as any,
  ];
  const allowed = [
    process.env.GOOGLE_OAUTH_CLIENT_ID_ANDROID,
    process.env.GOOGLE_OAUTH_CLIENT_ID_IOS,
    process.env.GOOGLE_OAUTH_CLIENT_ID_WEB,
  ].filter(Boolean) as string[];
  const { payload } = await jwtVerify(idToken, googleJWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: allowed.length ? allowed : undefined,
  });
  return { sub: String(payload.sub), email: typeof payload.email === 'string' ? payload.email : undefined };
}

export async function verifyAppleIdToken(idToken: string): Promise<OAuthProfile> {
  const allowed = [process.env.APPLE_AUDIENCE].filter(Boolean) as string[];
  const { payload } = await jwtVerify(idToken, appleJWKS, {
    issuer: 'https://appleid.apple.com',
    audience: allowed.length ? allowed : undefined,
  });
  return { sub: String(payload.sub), email: typeof payload.email === 'string' ? payload.email : undefined };
}
