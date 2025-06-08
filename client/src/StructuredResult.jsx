import React from 'react';

const parseSections = (text) => {
  const sections = {
    jobTitle: '',
    score: '',
    matches: [],
    weaknesses: [],
    suggestions: [],
  };

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  let current = '';

  for (let line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith('step 1')) {
      sections.jobTitle = line.replace(/^step 1:\s*/i, '');
    }

    // Suitability Score
    else if (lower.includes('suitability score')) {
      const match = line.match(/suitability score[^:\d]*[:=]?\s*(\d{1,3})/i);
      if (match) {
        sections.score = `Suitability Score: ${match[1]}`;
      }
      current = '';
    }

    // Start of new section with content on the same line
    else if (lower.includes('key matching points')) {
      current = 'matches';
      const parts = line.split(':');
      if (parts[1]) sections.matches.push(parts[1].trim());
    } else if (lower.includes('weak') || lower.includes('missing')) {
      current = 'weaknesses';
      const parts = line.split(':');
      if (parts[1]) sections.weaknesses.push(parts[1].trim());
    } else if (lower.includes('suggestion')) {
      current = 'suggestions';
      const parts = line.split(':');
      if (parts[1]) sections.suggestions.push(parts[1].trim());
    }

    // Bulleted/numbered lines within current section
    else if ((line.startsWith('-') || /^\d+\./.test(line)) && current) {
      sections[current].push(line.replace(/^[-\d.]+\s*/, ''));
    }
  }

  return sections;
};



const StructuredResult = ({ rawText }) => {
  const { jobTitle, score, matches, weaknesses, suggestions } = parseSections(rawText);

  return (
    <div className="space-y-6 text-sm leading-relaxed">
      {jobTitle && (
        <div>
          <h3 className="text-lg font-semibold text-muted mb-1">📌 Job Summary</h3>
          <p className="bg-background border border-border p-3 rounded">{jobTitle}</p>
        </div>
      )}

      {score && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-1">🎯 Match Score</h3>
          <p className="bg-background border border-border p-3 rounded">{score}</p>
        </div>
      )}

      {matches.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-green-500 mb-1">✅ Key Matching Points</h3>
          <ul className="list-disc pl-5 space-y-1">
            {matches.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
      )}

      {weaknesses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-red-500 mb-1">❌ Weak or Missing Qualifications</h3>
          <ul className="list-disc pl-5 space-y-1">
            {weaknesses.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-yellow-500 mb-1">💡 Suggestions for Improvement</h3>
          <ul className="list-disc pl-5 space-y-1">
            {suggestions.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StructuredResult;
