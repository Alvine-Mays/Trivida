import request from 'supertest';
import { app } from './test-setup.js';
import { ExchangeRateCache } from '../src/models/ExchangeRateCache.js';

async function token() {
  await request(app).post('/auth/register').send({ email: 'f@x.com', password: 'Password1' });
  const res = await request(app).post('/auth/login').send({ email: 'f@x.com', password: 'Password1' });
  return res.body.tokens.accessToken as string;
}

describe('Finance FX', () => {
  let t = '';
  beforeAll(async () => {
    t = await token();
    const now = new Date();
    const exp = new Date(now.getTime() + 12 * 3600 * 1000);
    await ExchangeRateCache.create({ base: 'XAF', target: 'USD', rate: 0.0017, fetchedAt: now, expiresAt: exp });
    await ExchangeRateCache.create({ base: 'XAF', target: 'EUR', rate: 0.0015, fetchedAt: now, expiresAt: exp });
    await request(app).post('/finance/categories').set('Authorization', `Bearer ${t}`).send({ name: 'Food', type: 'expense' });
  });

  it('summary converts to USD', async () => {
    const cats = await request(app).get('/finance/categories').set('Authorization', `Bearer ${t}`);
    const catId = cats.body[0]._id;
    await request(app).post('/finance/transactions').set('Authorization', `Bearer ${t}`).send({ categoryId: catId, amountMinor: 1000, currency: 'XAF', date: new Date().toISOString() });
    const res = await request(app).get('/finance/summary?baseCurrency=USD').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.baseCurrency).toBe('USD');
  });

  it('export.csv includes amountInBaseMinor', async () => {
    const res = await request(app).get('/finance/export.csv?baseCurrency=EUR').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('baseCurrency');
  });
});
