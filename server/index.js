const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 🚫 Limit: 5 requests per IP per hour
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many requests — try again in an hour.' },
});
app.use('/api/', limiter);

// ✅ OpenAI configuration (v4 SDK)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/match', async (req, res) => {
  const { resume, jobAd } = req.body;

  const prompt = `
Compare the following resume with the job ad and provide:
1. A match score out of 100
2. A short explanation
3. Suggestions for improvement

Resume:
${resume}

Job Ad:
${jobAd}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 700,
      temperature: 0.7,
    });

    res.json({ result: completion.choices[0].message.content });
  } catch (error) {
    console.error('OpenAI Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
