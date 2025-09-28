import { NextFunction, Request, Response } from 'express';
import { verifyAccess } from '../utils/jwt.js';
import { ApiError } from '../utils/errors.js';

export type AuthedRequest = Request & { userId?: string; jti?: string };

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t) return next(new ApiError('UNAUTHENTICATED', 'Missing token', 401));
  try {
    const decoded = verifyAccess(t);
    req.userId = decoded.sub;
    req.jti = decoded.jti;
    next();
  } catch (e) {
    next(new ApiError('TOKEN_EXPIRED', 'Invalid or expired token', 401));
  }
}
