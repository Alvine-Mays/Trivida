import request from 'supertest';
import { app } from './test-setup.js';

describe('Events public/private + RSVP', () => {
  let token = '';
  let slug = '';
  let eventId = '';

  beforeAll(async () => {
    await request(app).post('/auth/register').send({ email: 'ev@t.com', password: 'Password1' });
    const res = await request(app).post('/auth/login').send({ email: 'ev@t.com', password: 'Password1' });
    token = res.body.tokens.accessToken;
  });

  it('creates private event', async () => {
    const res = await request(app).post('/events').set('Authorization', `Bearer ${token}`).send({ title: 'Dîner', dateTime: new Date().toISOString(), visibility: 'private', accessCode: '1234', costPerGuestMinor: 2000 });
    expect(res.status).toBe(201);
    slug = res.body.slug;
    eventId = res.body._id;
  });

  it('public GET requires accessCode for private', async () => {
    const res = await request(app).get(`/public/events/${slug}`);
    expect(res.status).toBe(403);
  });

  it('public RSVP with accessCode works', async () => {
    const res = await request(app).post(`/public/events/${slug}/rsvp`).send({ name: 'John', status: 'yes', plusOnes: 1, accessCode: '1234' });
    expect([200,201]).toContain(res.status);
  });

  it('budget reflects yes + plusOnes', async () => {
    const res = await request(app).get(`/events/${eventId}/budget`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.actualBudgetMinor).toBeGreaterThan(0);
  });
});
