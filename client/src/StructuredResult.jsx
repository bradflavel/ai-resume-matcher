// renders the backend's analysis JSON into readable sections
// no parsing here, the server already returns a validated shape

const StructuredResult = ({ result }) => {
  if (!result) return null;
  const { score, matches = [], weaknesses = [], suggestions = [] } = result;

  return (
    <div className="space-y-6 text-sm leading-relaxed">
      {typeof score === 'number' && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-1">Match Score</h3>
          <p className="bg-background border border-border p-3 rounded">
            {score} / 100
          </p>
        </div>
      )}

      {matches.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-green-500 mb-1">Key Matching Points</h3>
          <ul className="list-disc pl-5 space-y-1">
            {matches.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
      )}

      {weaknesses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-red-500 mb-1">Weak or Missing Qualifications</h3>
          <ul className="list-disc pl-5 space-y-1">
            {weaknesses.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-yellow-500 mb-1">Suggestions for Improvement</h3>
          <ul className="list-disc pl-5 space-y-1">
            {suggestions.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StructuredResult;
