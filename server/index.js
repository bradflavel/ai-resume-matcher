const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many requests — try again in an hour.' },
});
app.use('/api/', limiter);

const upload = multer();

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

app.post('/api/match-pdf-url', upload.single('resume'), async (req, res) => {
  try {
    const jobAdUrl = req.body.jobAdUrl;
    const resumeFile = req.file;

    if (!jobAdUrl || !resumeFile) {
      return res.status(400).json({ error: 'Missing job ad URL or resume PDF.' });
    }

    const resumeText = (await pdfParse(resumeFile.buffer)).text;

    const jobAdResponse = await fetch(jobAdUrl);
    const jobAdHtml = await jobAdResponse.text();

    const result = `
Mock result:
Resume Text (first 500 chars):
${resumeText.slice(0, 500)}

Job Ad Text (first 500 chars):
${jobAdHtml.slice(0, 500)}

(Once OpenAI is enabled, this will return a real comparison.)
`;

    res.json({ result });
  } catch (err) {
    console.error('Error in /api/match-pdf-url:', err);
    res.status(500).json({ error: 'Failed to process resume or job ad.' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
