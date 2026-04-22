// integration tests for POST /api/match-pdf-url
// we hit the route via supertest and mock the external services (openai, pdf-parse, dns, fetch)
// goal: prove every error branch returns the right status, and the happy path still works

import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  aiSuccess,
  aiTruncated,
  aiNestedOutput,
  aiMalformedJson,
  aiSchemaMismatch,
  htmlFetchResponse,
  binaryFetchResponse,
  timeoutError,
  defaultResultObj,
} from './helpers/mocks.js';

// hoisted so the refs exist before vi.mock factories run
const mocks = vi.hoisted(() => ({
  openaiCreate: vi.fn(),
  pdfParse: vi.fn(),
  dnsLookup: vi.fn(),
}));

// mock openai so tests never hit the real api
vi.mock('openai', () => {
  class MockOpenAI {
    constructor() {
      this.responses = { create: mocks.openaiCreate };
    }
  }
  return { default: MockOpenAI };
});

// mock pdf-parse, route tests don't care about real pdf decoding
// match the same inner path index.js imports from
vi.mock('pdf-parse/lib/pdf-parse.js', () => ({
  default: mocks.pdfParse,
}));

// mock dns so we can simulate public vs private ip resolution
// register under both specifiers, node resolves builtins under either name
vi.mock('dns', () => ({
  promises: { lookup: mocks.dnsLookup },
  default: { promises: { lookup: mocks.dnsLookup } },
}));
vi.mock('node:dns', () => ({
  promises: { lookup: mocks.dnsLookup },
  default: { promises: { lookup: mocks.dnsLookup } },
}));

// import the app AFTER the mocks above, vi.mock is hoisted so this works
import app from '../index.js';

// buffer contents don't matter, multer only checks the mime header
const pdfBuffer = Buffer.from('fake pdf bytes');

beforeEach(() => {
  vi.clearAllMocks();

  // sensible defaults, individual tests override when needed
  mocks.openaiCreate.mockResolvedValue(aiSuccess());
  mocks.pdfParse.mockResolvedValue({ text: 'Experienced software engineer, 5 years.' });
  mocks.dnsLookup.mockResolvedValue({ address: '8.8.8.8' });

  // stub global fetch, tests that need a specific shape override this
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlFetchResponse()));
});

describe('POST /api/match-pdf-url happy path', () => {
  it('returns a structured JSON body for text mode', async () => {
    const res = await request(app)
      .post('/api/match-pdf-url')
      .attach('resume', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'text')
      .field('jobAdText', 'Looking for a senior Node.js engineer');

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(defaultResultObj.score);
    expect(Array.isArray(res.body.matches)).toBe(true);
    expect(Array.isArray(res.body.weaknesses)).toBe(true);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
    expect(res.body.matches.length).toBeGreaterThan(0);
    expect(mocks.openaiCreate).toHaveBeenCalledTimes(1);
  });

  it('returns a structured JSON body for link mode', async () => {
    const res = await request(app)
      .post('/api/match-pdf-url')
      .attach('resume', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'link')
      .field('jobAdUrl', 'https://example.com/job');

    expect(res.status).toBe(200);
    expect(typeof res.body.score).toBe('number');
    expect(res.body.score).toBeGreaterThanOrEqual(0);
    expect(res.body.score).toBeLessThanOrEqual(100);
    // dns check + fetch should have both run for a link-mode request
    expect(mocks.dnsLookup).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalled();
  });

  it('falls back to gpt-4o-mini when the primary model returns truncated output', async () => {
    const fallbackResult = { ...defaultResultObj, score: 70 };
    mocks.openaiCreate
      .mockResolvedValueOnce(aiTruncated())
      .mockResolvedValueOnce(aiSuccess(fallbackResult));

    const res = await request(app)
      .post('/api/match-pdf-url')
      .attach('resume', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'text')
      .field('jobAdText', 'Role');

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(70);
    expect(mocks.openaiCreate).toHaveBeenCalledTimes(2);
  });

  it('handles the nested output[] format from the responses api', async () => {
    const altResult = { ...defaultResultObj, score: 88 };
    mocks.openaiCreate.mockResolvedValue(aiNestedOutput(altResult));

    const res = await request(app)
      .post('/api/match-pdf-url')
      .attach('resume', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'text')
      .field('jobAdText', 'Role');

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(88);
  });
});

describe('POST /api/match-pdf-url input validation', () => {
  it('400 when no resume file is attached', async () => {
    const res = await request(app)
      .post('/api/match-pdf-url')
      .field('inputMode', 'text')
      .field('jobAdText', 'Role');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('400 when text mode is missing jobAdText', async () => {
    const res = await request(app)
      .post('/api/match-pdf-url')
      .attach('resume', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'text');
    expect(res.status).toBe(400);
  });

  it('400 when link mode is missing jobAdUrl', async () => {
    const res = await request(app)
      .post('/api/match-pdf-url')
      .attach('resume', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'link');
    expect(res.status).toBe(400);
  });

  it('400 for non-PDF mime type (multer fileFilter rejects)', async () => {
    const res = await request(app)
      .post('/api/match-pdf-url')
      .attach('resume', Buffer.from('hello'), { filename: 'resume.txt', contentType: 'text/plain' })
      .field('inputMode', 'text')
      .field('jobAdText', 'Role');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/PDF/i);
  });

  it('413 when the uploaded file exceeds 10MB', async () => {
    // 11MB buffer, multer should reject before we ever reach pdf-parse
    const big = Buffer.alloc(11 * 1024 * 1024, 0x50);
    const res = await request(app)
      .post('/api/match-pdf-url')
      .attach('resume', big, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'text')
      .field('jobAdText', 'Role');

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/too large/i);
  });

  it('400 when the pdf has no extractable text', async () => {
    mocks.pdfParse.mockResolvedValue({ text: '   ' });
    const res = await request(app)
      .post('/api/match-pdf-url')
      .attach('resume', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'text')
      .field('jobAdText', 'Role');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/PDF/i);
  });
});

describe('POST /api/match-pdf-url URL safety (SSRF)', () => {
  // small helper, every test in this block posts a link-mode request
  const sendLink = (url) =>
    request(app)
      .post('/api/match-pdf-url')
      .attach('resume', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'link')
      .field('jobAdUrl', url);

  it('400 for localhost', async () => {
    const res = await sendLink('http://localhost/job');
    expect(res.status).toBe(400);
    // fetch must never be reached for blocked urls
    expect(fetch).not.toHaveBeenCalled();
  });

  it('400 for 127.0.0.1', async () => {
    const res = await sendLink('http://127.0.0.1/job');
    expect(res.status).toBe(400);
  });

  it('400 for cloud metadata endpoint 169.254.169.254', async () => {
    const res = await sendLink('http://169.254.169.254/latest/meta-data/');
    expect(res.status).toBe(400);
  });

  it('400 for 10.x private range', async () => {
    const res = await sendLink('http://10.0.0.1/job');
    expect(res.status).toBe(400);
  });

  it('400 for 192.168.x private range', async () => {
    const res = await sendLink('http://192.168.1.1/job');
    expect(res.status).toBe(400);
  });

  it('400 when a public hostname resolves to a private ip', async () => {
    // hostname passes the static regex but DNS says private, DNS check catches it
    mocks.dnsLookup.mockResolvedValue({ address: '10.0.0.5' });
    const res = await sendLink('https://sneaky.example.com/job');
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('400 when the hostname cannot be resolved', async () => {
    mocks.dnsLookup.mockRejectedValue(new Error('ENOTFOUND'));
    const res = await sendLink('https://does-not-exist.example.test/job');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/resolve/i);
  });

  it('400 for a malformed URL', async () => {
    // unclosed bracket, new URL() throws
    const res = await sendLink('http://[invalid');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/match-pdf-url URL fetch behavior', () => {
  const sendLink = (url) =>
    request(app)
      .post('/api/match-pdf-url')
      .attach('resume', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'link')
      .field('jobAdUrl', url);

  it('400 when the fetched url returns a non-html content type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(binaryFetchResponse()));
    const res = await sendLink('https://example.com/file.zip');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/text|html/i);
  });

  it('400 when the fetch times out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError()));
    const res = await sendLink('https://slow.example.com');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too long/i);
  });

  it('400 when the fetch returns a non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => 'text/html' },
      text: async () => 'error page',
    }));
    const res = await sendLink('https://example.com/bad');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/match-pdf-url openai failures', () => {
  it('502 when openai throws', async () => {
    mocks.openaiCreate.mockRejectedValue(new Error('boom from provider'));
    const res = await request(app)
      .post('/api/match-pdf-url')
      .attach('resume', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'text')
      .field('jobAdText', 'Role');

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/AI/i);
    // raw provider error must not leak to the client
    expect(res.body.error).not.toContain('boom from provider');
  });

  it('502 when both primary and fallback return empty text', async () => {
    mocks.openaiCreate
      .mockResolvedValueOnce(aiTruncated())
      .mockResolvedValueOnce({ output_text: '', status: 'completed' });

    const res = await request(app)
      .post('/api/match-pdf-url')
      .attach('resume', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'text')
      .field('jobAdText', 'Role');

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/empty/i);
  });

  it('502 when the model returns malformed JSON', async () => {
    mocks.openaiCreate.mockResolvedValue(aiMalformedJson());
    const res = await request(app)
      .post('/api/match-pdf-url')
      .attach('resume', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'text')
      .field('jobAdText', 'Role');

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/malformed/i);
  });

  it('502 when the model returns JSON with the wrong shape', async () => {
    mocks.openaiCreate.mockResolvedValue(aiSchemaMismatch());
    const res = await request(app)
      .post('/api/match-pdf-url')
      .attach('resume', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .field('inputMode', 'text')
      .field('jobAdText', 'Role');

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/shape/i);
  });
});
