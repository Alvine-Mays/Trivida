import { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { ApiError } from '../utils/errors.js';

export function requireCronKey(req: Request, _res: Response, next: NextFunction) {
  const k = req.header('X-Cron-Key');
  if (!k || k !== config.cronKey) return next(new ApiError('FORBIDDEN', 'Invalid cron key', 403));
  next();
}
