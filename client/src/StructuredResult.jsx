import React from 'react';

const parseSections = (text) => {
  const sections = {
    score: '',
    matches: [],
    weaknesses: [],
    suggestions: [],
  };

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  let current = '';

  for (let line of lines) {
    if (/^1\..*score/i.test(line)) {
      sections.score = line.replace(/^1\.\s*/, '');
      current = 'score';
    } else if (/^2\./.test(line)) {
      current = 'matches';
    } else if (/^3\./.test(line)) {
      current = 'weaknesses';
    } else if (/^4\./.test(line)) {
      current = 'suggestions';
    } else if (line.startsWith('-') && current && current !== 'score') {
      sections[current].push(line.replace(/^-+\s*/, ''));
    }
  }

  return sections;
};

const StructuredResult = ({ rawText }) => {
  const { score, matches, weaknesses, suggestions } = parseSections(rawText);

  return (
    <div className="space-y-6 text-sm leading-relaxed">
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
