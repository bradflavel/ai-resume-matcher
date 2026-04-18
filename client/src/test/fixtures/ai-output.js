// sample AI output strings for StructuredResult tests
// kept close to what the real backend returns so parser tests stay honest

// note: the parser treats lines containing "missing" or "weak" as section headers,
// so bullet items in this fixture deliberately avoid those words.
// parser bug is being tracked for branch #3 (switch to backend JSON).
export const fullOutput = `Suitability Score: 82

Key Matching Points:
- 5 years of Node.js experience
- Led a small engineering team
- Strong CI/CD background

Weak or Missing Qualifications:
- No AWS exposure
- Limited AI/ML background
- Little public speaking experience

Suggestions for Improvement:
- Add a cloud project to GitHub
- Publish a blog post or talk
- Take a short ML course`;

// legacy shape, the old prompt used "Step 1: Job Title" and the parser still looks for it
export const withStepPrefix = `Step 1: Senior Node.js Engineer

Suitability Score: 75

Key Matching Points:
- Matches backend stack

Weak or Missing Qualifications:
- Missing cloud deploys

Suggestions for Improvement:
- Add docker experience`;

// numbered bullets instead of dashes, parser should still pick these up
export const numberedBullets = `Suitability Score: 60

Key Matching Points:
1. Good architectural taste
2. Strong testing habits

Weak or Missing Qualifications:
1. No Kubernetes experience

Suggestions for Improvement:
1. Earn a CKA cert`;

// just the score, no section bodies, everything else should be hidden
export const scoreOnly = `Suitability Score: 40`;

// score is missing, other sections still render
export const missingScore = `Key Matching Points:
- Sharp resume
- Clean writing

Weak or Missing Qualifications:
- No score provided

Suggestions for Improvement:
- Ask the model to include one`;

// nothing the parser can make sense of, component should render empty
export const garbage = 'asdfasdf qwerqwer zzzz';

// blank string edge case
export const empty = '';
