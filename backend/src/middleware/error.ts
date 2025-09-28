import { NextFunction, Request, Response } from 'express';
import { ApiError, errorBody } from '../utils/errors.js';
import { ZodError } from 'zod';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Ressource introuvable' });
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const reqId = (req as any).reqId || '';

  // Zod validation
  if (err instanceof ZodError) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Requête invalide', details: err.flatten(), requestId: reqId });
  }

  // ApiError explicite
  if (err instanceof ApiError) {
    return res.status(err.status).json({ ...errorBody(err), requestId: reqId });
  }

  // Duplicate key Mongo
  if (err?.name === 'MongoServerError' && (err?.code === 11000 || String(err?.message || '').includes('E11000'))) {
    return res.status(409).json({ code: 'CONFLICT', message: 'Conflit de données (doublon)', details: { keyValue: err?.keyValue }, requestId: reqId });
  }

  // Erreur générique — ne pas exposer les détails en prod
  // Log local pour diagnostic
  // eslint-disable-next-line no-console
  console.error('[error]', reqId, err?.stack || err);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue', requestId: reqId });
}
