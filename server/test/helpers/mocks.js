// shared factories for test response shapes
// vi.mock calls live in the test files themselves so they get hoisted correctly,
// this module just provides convenient response builders

export const defaultAiText = `Suitability Score: 82

Key Matching Points:
- 5 years of relevant experience
- Strong Node.js background
- Led a team of 3 engineers

Weak or Missing Qualifications:
- Limited exposure to AWS
- No public speaking experience
- Missing AI/ML background

Suggestions for Improvement:
- Highlight cloud projects on GitHub
- Add conference talks to CV
- Take an ML foundations course`;

// shape returned by openai.responses.create when the call succeeds
export function aiSuccess(text = defaultAiText) {
  return { output_text: text, status: 'completed' };
}

// shape when the model ran out of output tokens before finishing
export function aiTruncated() {
  return {
    output_text: '',
    status: 'incomplete',
    incomplete_details: { reason: 'max_output_tokens' },
  };
}

// shape when openai returns output via the nested output array instead of output_text
export function aiNestedOutput(text = defaultAiText) {
  return {
    output_text: '',
    status: 'completed',
    output: [
      {
        type: 'message',
        content: [{ type: 'output_text', output_text: text }],
      },
    ],
  };
}

// fake fetch response that looks like a real html page
export function htmlFetchResponse(body = '<html><body>Senior Engineer wanted</body></html>') {
  return {
    ok: true,
    headers: {
      get: (h) =>
        h.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null,
    },
    text: async () => body,
  };
}

// fake fetch response with a content-type that should be rejected
export function binaryFetchResponse() {
  return {
    ok: true,
    headers: { get: () => 'application/octet-stream' },
    text: async () => 'binary noise',
  };
}

// simulate an AbortSignal.timeout firing mid-fetch
export function timeoutError() {
  const err = new Error('The operation was aborted due to timeout');
  err.name = 'TimeoutError';
  return err;
}
