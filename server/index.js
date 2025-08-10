const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const multer = require('multer');
const pdfParse = require('pdf-parse');
require('dotenv').config(); // Load .env variables (API keys, PORT, etc.)

const app = express();
app.set('trust proxy', 1); // Trust proxy headers (helpful on hosts like Render)
app.use(cors()); // Allow the frontend (different origin) to call this API
app.use(express.json()); // Parse JSON bodies on incoming requests

// Basic safety net: throttle how often a single IP can hit the API
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1-hour window
  max: 5, // max 5 requests per hour per IP
  message: { error: 'Too many requests — try again in an hour.' },
});
app.use('/api/', limiter); // Only throttle the API routes

const upload = multer(); // Handle multipart/form-data (for the PDF upload)

// OpenAI client setup — pulls the key from the environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Prefer OPENAI_MODEL from env; fall back to GPT-5 if not set
const MODEL = process.env.OPENAI_MODEL || 'gpt-5';

// POST /api/match-pdf-url
// Accepts: resume PDF + either a job ad URL or the full job ad text
app.post('/api/match-pdf-url', upload.single('resume'), async (req, res) => {
  try {
    const { inputMode, jobAdUrl, jobAdText } = req.body;
    const resumeFile = req.file;

    // Validate required fields
    if (!resumeFile || !inputMode || (inputMode === 'link' && !jobAdUrl) || (inputMode === 'text' && !jobAdText)) {
      return res.status(400).json({ error: 'Missing required input fields.' });
    }

    // Extract raw text from the uploaded PDF
    const resumeText = (await pdfParse(resumeFile.buffer)).text || '';
    const trimmedResume = resumeText.slice(0, 6000);

    // Basic sanity checks
    if (!trimmedResume.trim()) {
      console.log('Resume text was empty after parsing.');
      return res.status(400).json({ error: 'Could not read text from the uploaded PDF. Try a different PDF.' });
    }

    // Get the job ad content
    let jobAdContent = '';
    if (inputMode === 'text') {
      jobAdContent = (jobAdText || '').slice(0, 8000);
    } else {
      // Ensure URL looks valid
      let url = jobAdUrl;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      try {
        const response = await fetch(url);
        jobAdContent = (await response.text()).slice(0, 8000);
      } catch (e) {
        console.error('Fetch job ad failed:', e);
        return res.status(400).json({ error: 'Failed to fetch job ad from the provided URL.' });
      }
    }

    if (!jobAdContent.trim()) {
      console.log('Job ad content is empty.');
      return res.status(400).json({ error: 'Job ad content was empty. Check the URL or pasted text.' });
    }

    // Prompt (unchanged)
    const prompt = `
You are an experienced technical recruiter. Your job is to evaluate how well this applicant’s resume matches the job ad. 
Be constructive but direct, focusing on facts from the resume — do not assume skills or experience that are not stated.

Follow this exact output format (do not add extra text before or after):

Suitability Score: [0–100]  ← round to nearest whole number

Key Matching Points:
- [Brief bullet point 1]
- [Brief bullet point 2]
- [Brief bullet point 3]

Weak or Missing Qualifications:
- [Brief bullet point 1]
- [Brief bullet point 2]
- [Brief bullet point 3]

Suggestions for Improvement:
- [Actionable suggestion 1]
- [Actionable suggestion 2]
- [Actionable suggestion 3]

Evaluation Criteria:
1. Match of skills, certifications, and experience to the role requirements.
2. Alignment of industry and job function.
3. Evidence of relevant achievements or measurable results.
4. Education or qualifications required.
5. Use of role-specific keywords found in the job ad.

Resume:
${trimmedResume}

Job Ad:
${jobAdContent}
`;

    // Build payload for GPT-5 vs older models
    const isG5Family = /^gpt-5/i.test(MODEL);
    const payload = {
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      ...(isG5Family ? { max_completion_tokens: 1400 } : { max_tokens: 1000 }),
    };
    if (!isG5Family) payload.temperature = 0.7;

    // Call OpenAI with error trapping
    let completion;
    try {
      completion = await openai.chat.completions.create(payload);
    } catch (e) {
      console.error('OpenAI error:', e.status || e.response?.status, e.response?.data || e.message);
      return res.status(502).json({
        error: e.response?.data?.error?.message || e.message || 'AI request failed.',
      });
    }

    // Send back the content
    console.dir(completion, { depth: null });
    const out = completion.choices?.[0]?.message?.content || '';
    console.log('AI result length:', out.length, 'first 120 chars:', out.slice(0, 120));
    return res.json({ result: out });
  } catch (err) {
    console.error('Error in /api/match-pdf-url:', err);
    res.status(500).json({ error: 'Failed to process resume or job ad.' });
  }
});


// Health check routes
app.get('/', (_req, res) => {
  res.status(200).send('OK');
});

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Boot the server — PORT is set by host in production; fallback for local dev
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`✅ Server running at http://localhost:${PORT} (healthz v2)`);
});
