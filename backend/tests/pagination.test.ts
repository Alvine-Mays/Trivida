import request from 'supertest';
import { app } from './test-setup.js';

async function token() {
  await request(app).post('/auth/register').send({ email: 'p@t.com', password: 'Password1' });
  const res = await request(app).post('/auth/login').send({ email: 'p@t.com', password: 'Password1' });
  return res.body.tokens.accessToken as string;
}

describe('Pagination /finance/transactions', () => {
  let t = '';
  beforeAll(async () => {
    t = await token();
    for (let i = 0; i < 25; i++) {
      await request(app)
        .post('/finance/transactions')
        .set('Authorization', `Bearer ${t}`)
        .send({ categoryId: '656565656565656565656565', amountMinor: 100 + i, currency: 'XAF', date: new Date().toISOString() });
    }
  });

  it('returns cursor', async () => {
    const res1 = await request(app).get('/finance/transactions?limit=10').set('Authorization', `Bearer ${t}`);
    expect(res1.status).toBe(200);
    expect(res1.body.items.length).toBe(10);
    expect(res1.body.nextCursor).toBeTruthy();
    const res2 = await request(app).get(`/finance/transactions?limit=10&cursor=${encodeURIComponent(res1.body.nextCursor)}`).set('Authorization', `Bearer ${t}`);
    expect(res2.body.items.length).toBeGreaterThan(0);
  });
});
