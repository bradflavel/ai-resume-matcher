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
You are an expert technical recruiter. Analyze the resume and job ad with ruthless honesty. Speak **directly to the applicant** (use "you", not "they").

Step 1: Identify the job title and industry based on the job ad. Be specific.

Step 2: Give feedback in **second person voice** using the following structure:

1. Suitability Score (0–100): Be strict. Use this scale:
   - 0–20: No relevant qualifications
   - 21–50: Some overlap but not competitive
   - 51–70: Moderate match, may need improvement
   - 71–90: Strong match
   - 91–100: Excellent fit, clearly qualified

2. Key Matching Points: Describe what makes **you** suitable based on the resume (e.g. “You have experience in...”).

3. Weak or Missing Qualifications: Point out what **you lack** or what is not mentioned (e.g. “You don’t mention any experience with...”).

4. Suggestions for Improvement: Offer practical tips. Focus on what **you can improve**, add, or reframe to better match this job.

Do not assume anything that isn’t written in the resume. Be concise but realistic.

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
