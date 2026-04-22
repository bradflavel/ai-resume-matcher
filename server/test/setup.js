// runs before each test file
// index.js reads env at load time so we need these set first
// NODE_ENV=test also skips the rate limiter and app.listen (see index.js)

process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key-not-real';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
