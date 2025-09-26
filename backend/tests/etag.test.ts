import request from 'supertest';
import { app } from './test-setup.js';

async function registerAndGetToken() {
  await request(app).post('/auth/register').send({ email: 'e@t.com', password: 'Password1' });
  const res = await request(app).post('/auth/login').send({ email: 'e@t.com', password: 'Password1' });
  return res.body.tokens.accessToken as string;
}

describe('ETag /decisions', () => {
  let token = '';
  let id = '';
  let etag = '';

  beforeAll(async () => {
    token = await registerAndGetToken();
  });

  it('creates decision', async () => {
    const res = await request(app).post('/decisions').set('Authorization', `Bearer ${token}`).send({ title: 'Test', factors: { budgetImpact: 1, longTermBenefit: 1, urgency: 0.5 } });
    expect(res.status).toBe(201);
    id = res.body.decision._id;
  });

  it('gets ETag', async () => {
    const res = await request(app).get(`/decisions/${id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers.etag).toBeTruthy();
    etag = res.headers.etag;
  });

  it('rejects mismatched If-Match', async () => {
    const res = await request(app).patch(`/decisions/${id}`).set('Authorization', `Bearer ${token}`).set('If-Match', '0').send({ title: 'Nope' });
    expect(res.status).toBe(412);
  });

  it('accepts correct If-Match', async () => {
    const res = await request(app).patch(`/decisions/${id}`).set('Authorization', `Bearer ${token}`).set('If-Match', etag).send({ title: 'OK' });
    expect(res.status).toBe(200);
  });
});
