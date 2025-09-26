import request from 'supertest';
import { app } from './test-setup.js';

describe('Auth', () => {
  let accessToken = '';
  let refreshToken = '';

  it('registers', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'a@b.com', password: 'Password1', name: 'A' });
    expect(res.status).toBe(201);
    expect(res.body.tokens.accessToken).toBeTruthy();
    accessToken = res.body.tokens.accessToken;
    refreshToken = res.body.tokens.refreshToken;
  });

  it('me works', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('a@b.com');
  });

  it('login fails with wrong password', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'a@b.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('refresh rotates', async () => {
    const res = await request(app).post('/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeTruthy();
  });

  it('logout revokes', async () => {
    const res = await request(app).post('/auth/logout').set('Authorization', `Bearer ${accessToken}`);
    expect([200,204]).toContain(res.status);
  });
});
