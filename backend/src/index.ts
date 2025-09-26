import { config } from './config.js';
import { connectMongo } from './db.js';
import { createApp } from './app.js';

async function main() {
  await connectMongo();
  const app = createApp();
  app.listen(config.port, () => {
    process.stdout.write(`Trivida API listening on :${config.port}\n`);
  });
}

main().catch((e) => {
  process.stderr.write(String(e) + '\n');
  process.exit(1);
});
