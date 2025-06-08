const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const multer = require('multer');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
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

// Route 1: Direct resume + jobAd comparison (pasted text)
app.post('/api/match', async (req, res) => {
  const { resume, jobAd } = req.body;

  const trimmedResume = resume.slice(0, 5000);
  const trimmedJobAd = jobAd.slice(0, 5000);

  const prompt = `
Compare the following resume with the job ad and provide:
1. A match score out of 100
2. A short explanation
3. Suggestions for improvement

Resume:
${trimmedResume}

Job Ad:
${trimmedJobAd}
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

// Route 2: Resume PDF + Job Ad URL
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

    // Trim both inputs to avoid context overflow
    const trimmedResume = resumeText.slice(0, 6000);
    const trimmedJobAd = jobAdHtml.slice(0, 8000);

    console.log('Trimmed resume length:', trimmedResume.length);
    console.log('Trimmed job ad length:', trimmedJobAd.length);

    const prompt = `
Compare the following resume (from PDF) with the job ad (from webpage). Provide:
1. A suitability score out of 100
2. Key matching points
3. Missing or weak qualifications
4. Suggestions for improvement

Resume:
${trimmedResume}

Job Ad:
${trimmedJobAd}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    res.json({ result: completion.choices[0].message.content });
  } catch (err) {
    console.error('Error in /api/match-pdf-url:', err);
    res.status(500).json({ error: 'Failed to process resume or job ad.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
