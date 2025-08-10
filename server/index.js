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

    // --- Validate inputs ----------------------------------------------------
    if (
      !resumeFile ||
      !inputMode ||
      (inputMode === 'link' && !jobAdUrl) ||
      (inputMode === 'text' && !jobAdText)
    ) {
      return res.status(400).json({ error: 'Missing required input fields.' });
    }

    // --- Parse resume PDF ---------------------------------------------------
    const resumeText = (await pdfParse(resumeFile.buffer)).text || '';
    const trimmedResume = resumeText.slice(0, 6000);
    if (!trimmedResume.trim()) {
      return res
        .status(400)
        .json({ error: 'Could not read text from the uploaded PDF. Try a different PDF.' });
    }

    // --- Get job ad content -------------------------------------------------
    let jobAdContent = '';
    if (inputMode === 'text') {
      jobAdContent = (jobAdText || '').slice(0, 8000);
    } else {
      let url = jobAdUrl;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url; // normalize bare domains
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        jobAdContent = (await r.text()).slice(0, 8000);
      } catch (e) {
        console.error('Fetch job ad failed:', e);
        return res.status(400).json({ error: 'Failed to fetch job ad from the provided URL.' });
      }
    }
    if (!jobAdContent.trim()) {
      return res.status(400).json({ error: 'Job ad content was empty. Check the URL or pasted text.' });
    }

    // --- Prompt -------------------------------------------------------------
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

    // ---------- OpenAI call (Responses API) with fallback ----------
    const isG5 = /^gpt-5/i.test(MODEL);

    // helper to call a model once with reasonable defaults
    async function runModelOnce(modelName, userPrompt) {
      const usingG5 = /^gpt-5/i.test(modelName);
      const params = {
        model: modelName,
        input: [
          { role: 'system', content: 'You are an experienced technical recruiter. Be concise and follow the requested format exactly.' },
          { role: 'user', content: userPrompt }
        ],
        max_output_tokens: 2048,             // give it room to actually write
        temperature: usingG5 ? 1 : 0.7,      // GPT-5 only supports default (1)
      };
      if (usingG5) {
        params.reasoning = { effort: 'low' };// reduce hidden thinking so we get text
      }
      const r = await openai.responses.create(params);
      return r;
    }

    // helper to extract text from Responses API result
    function extractText(r) {
      if (r.output_text && r.output_text.trim()) return r.output_text.trim();
      if (Array.isArray(r.output)) {
        const chunks = [];
        for (const item of r.output) {
          if (item.type === 'message' && Array.isArray(item.content)) {
            for (const c of item.content) {
              if (typeof c.text === 'string') chunks.push(c.text);
              if (c.type === 'output_text' && typeof c.output_text === 'string') chunks.push(c.output_text);
            }
          }
        }
        if (chunks.length) return chunks.join('\n').trim();
      }
      return '';
    }

    let aiResp;
    try {
      // 1) Try the configured model first (e.g., GPT-5)
      aiResp = await runModelOnce(MODEL, prompt);
      console.dir(aiResp, { depth: null });

      let out = extractText(aiResp);
      const finish = aiResp.incomplete_details?.reason || aiResp.status;
      console.log('Finish reason:', finish, '| out length:', out.length, '| first 120:', out.slice(0, 120));

      // 2) If empty or cut by token limit, retry once with a reliable non-reasoning model
      if (!out || finish === 'max_output_tokens') {
        console.warn('Empty/trimmed output; falling back to gpt-4o-mini…');
        const fb = await runModelOnce('gpt-4o-mini', prompt);
        console.dir(fb, { depth: null });
        out = extractText(fb);

        if (!out) {
          return res.status(502).json({
            error: 'Model returned empty text. Please try again with a smaller PDF or simpler job ad.',
          });
        }
      }

      return res.json({ result: out });
    } catch (e) {
      console.error('OpenAI error (responses):', e.status || e.response?.status, e.response?.data || e.message);
      return res.status(502).json({
        error: e.response?.data?.error?.message || e.message || 'AI request failed.',
      });
    }
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
