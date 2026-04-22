// health check endpoints, hit by uptime monitors and load balancers
// no mocking needed, these routes don't touch external services

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('GET /', () => {
  it('responds with 200 OK', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
  });
});

describe('GET /healthz', () => {
  it('responds with { status: "ok" }', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
