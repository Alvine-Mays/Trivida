import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import authRouter from './routes/auth.router.js';
import usersRouter from './routes/users.router.js';
import decisionRouter from './routes/decision.router.js';
import financeRouter from './routes/finance.router.js';
import eventsRouter from './routes/events.router.js';
import savingsRouter from './routes/savings.router.js';
import publicRouter from './routes/public.router.js';
import externalRouter from './routes/external.router.js';
import notificationsRouter from './routes/notifications.router.js';
import cronRouter from './routes/cron.router.js';
import businessRouter from './routes/business.router.js';
import billingRouter from './routes/billing.router.js';
import { errorHandler, notFound } from './middleware/error.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('tiny'));
  app.use(rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.max }));

  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use(decisionRouter);
  app.use(financeRouter);
  app.use(eventsRouter);
  app.use(savingsRouter);
  app.use(publicRouter);
  app.use(externalRouter);
  app.use(notificationsRouter);
  app.use(cronRouter);
  app.use(businessRouter);
  app.use(billingRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
