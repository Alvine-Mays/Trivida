import { NextFunction, Request, Response } from 'express';
import { ApiError, errorBody } from '../utils/errors.js';

export function notFound(req: Request, res: Response) {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Not found' });
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) return res.status(err.status).json(errorBody(err));
  res.status(500).json({ code: 'CONFLICT', message: err.message });
}
