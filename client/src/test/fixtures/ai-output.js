// sample JSON payloads for StructuredResult tests
// these mirror what the backend returns, validated against a zod schema server-side

export const fullResult = {
  score: 82,
  matches: [
    '5 years of Node.js experience',
    'Led a small engineering team',
    'Strong CI/CD background',
  ],
  weaknesses: [
    'No AWS exposure',
    'Limited AI/ML background',
    'Little public speaking experience',
  ],
  suggestions: [
    'Add a cloud project to GitHub',
    'Publish a blog post or talk',
    'Take a short ML course',
  ],
};

// a valid result where all bullet arrays are empty
// only the score block should render
export const scoreOnly = {
  score: 40,
  matches: [],
  weaknesses: [],
  suggestions: [],
};

// matches populated but nothing else
export const matchesOnly = {
  score: 55,
  matches: ['Sharp resume', 'Clean writing'],
  weaknesses: [],
  suggestions: [],
};
