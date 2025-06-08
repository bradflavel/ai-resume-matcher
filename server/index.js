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

const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

// 📄 Route: Resume PDF + Job Ad URL
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

    const trimmedResume = resumeText.slice(0, 6000);
    const trimmedJobAd = jobAdHtml.slice(0, 8000);

    const prompt = `
You are an expert technical recruiter. Analyze the resume and job ad with ruthless honesty.

Step 1: What is the job title and industry for this job ad?

Step 2: Compare the resume and job ad. Your output must have **these 4 sections**:
1. Suitability Score (0–100): Use strict scoring. If the resume lacks relevant experience, give under 30. Do NOT give 70+ unless the resume is clearly well-suited to the job.
2. Key Matching Points: Only include highly relevant, specific matches from the resume.
3. Weak or Missing Qualifications: Explicitly list what's missing.
4. Suggestions for Improvement: Specific ways to improve this resume for this job.

Do not assume anything not stated in the resume.

Resume:
${trimmedResume}

Job Ad:
${trimmedJobAd}
`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.4,
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
