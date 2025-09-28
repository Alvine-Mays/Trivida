import { Router } from 'express';
import mongoose from '../db.js';
import { config } from '../config.js';

const router = Router();

router.get('/debug/db-check', async (_req, res) => {
  const conn = mongoose.connection as any;
  const state = conn.readyState;
  const host = conn.host || conn.client?.s?.url || undefined;
  const name = conn.name;
  const driver = { mongoose: (mongoose as any).version, node: process.versions.node };
  const started = Date.now();
  let ok = false;
  let ms = -1;
  try {
    const admin = conn.db?.admin();
    if (!admin) throw new Error('No admin');
    // @ts-ignore
    await admin.ping?.();
    ms = Date.now() - started;
    ok = true;
  } catch (e: any) {
    return res.status(500).json({ ok: false, state, host, name, ms, driver });
  }
  res.json({ ok, state, host, name, ms, driver });
});

export default router;
