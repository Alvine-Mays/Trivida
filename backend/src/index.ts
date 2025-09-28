import { config } from './config.js';
import mongoose from './db.js';
import { connectMongo } from './db.js';
import { createApp } from './app.js';
import type { Server } from 'http';

let server: Server | null = null;
let shuttingDown = false;

async function main() {
  await connectMongo();
  const app = createApp();
  server = app.listen(config.port, () => {
    process.stdout.write(`Trivida API listening on :${config.port}\n`);
  });
}

async function gracefulExit(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    await mongoose.disconnect();
  } catch {}
  process.exit(code);
}

process.on('SIGINT', () => gracefulExit(0));
process.on('SIGTERM', () => gracefulExit(0));
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  gracefulExit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
  gracefulExit(1);
});

main().catch((e) => {
  console.error('[startupError]', e);
  gracefulExit(1);
});
