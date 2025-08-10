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

const MODEL = process.env.OPENAI_MODEL || 'gpt-5';

// POST /api/match-pdf-url
app.post('/api/match-pdf-url', upload.single('resume'), async (req, res) => {
  try {
    const { inputMode, jobAdUrl, jobAdText } = req.body;
    const resumeFile = req.file;

    if (!resumeFile || !inputMode || (inputMode === 'link' && !jobAdUrl) || (inputMode === 'text' && !jobAdText)) {
      return res.status(400).json({ error: 'Missing required input fields.' });
    }

    const resumeText = (await pdfParse(resumeFile.buffer)).text;
    const trimmedResume = resumeText.slice(0, 6000);

    let jobAdContent = '';
    if (inputMode === 'text') {
      jobAdContent = jobAdText.slice(0, 8000);
    } else {
      const response = await fetch(jobAdUrl);
      jobAdContent = (await response.text()).slice(0, 8000);
    }

    const prompt = `
You are an expert technical recruiter. Analyze the resume and job ad with ruthless honesty. Speak directly to the applicant ("you").

Step 1: Identify the job title and industry.

Step 2: Give feedback using this format:

1. Suitability Score (just one number between 0 and 100): Write it like "Suitability Score: 27".

2. Key Matching Points: List what makes you suitable (e.g., "You have experience in...").

3. Weak or Missing Qualifications: Point out what's missing (e.g., "You don’t mention...").

4. Suggestions for Improvement: Suggest specific improvements.

Resume:
${trimmedResume}

Job Ad:
${jobAdContent}
`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
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
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
