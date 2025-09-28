import { NextFunction, Request, Response } from 'express';

export function setEtag(res: Response, updatedAt?: Date) {
  if (!updatedAt) return;
  res.setHeader('ETag', String(updatedAt.getTime()));
}

export function checkIfMatch(req: Request, current: Date) {
  const ifMatch = req.header('If-Match');
  if (!ifMatch) return true;
  return ifMatch === String(current.getTime());
}
