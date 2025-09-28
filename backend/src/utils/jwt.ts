import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { v4 as uuidv4 } from 'uuid';

export type Tokens = {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt: number;
  jti: string;
};

export function signTokens(userId: string) {
  const jti = uuidv4();
  const accessExpSec = Math.floor(Date.now() / 1000) + config.jwt.accessTtlMin * 60;
  const refreshExpSec = Math.floor(Date.now() / 1000) + config.jwt.refreshTtlDays * 24 * 60 * 60;
  const accessToken = jwt.sign({ sub: userId, jti }, config.jwt.accessSecret, { algorithm: 'HS256', expiresIn: config.jwt.accessTtlMin * 60 });
  const refreshToken = jwt.sign({ sub: userId, jti, type: 'refresh' }, config.jwt.refreshSecret, { algorithm: 'HS256', expiresIn: config.jwt.refreshTtlDays * 24 * 60 * 60 });
  return {
    accessToken,
    accessTokenExpiresAt: accessExpSec * 1000,
    refreshToken,
    refreshTokenExpiresAt: refreshExpSec * 1000,
    jti,
  } satisfies Tokens;
}

export function verifyAccess(token: string) {
  return jwt.verify(token, config.jwt.accessSecret) as { sub: string; jti: string; exp: number };
}

export function verifyRefresh(token: string) {
  return jwt.verify(token, config.jwt.refreshSecret) as { sub: string; jti: string; exp: number; type: string };
}
