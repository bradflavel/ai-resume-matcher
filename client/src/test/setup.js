// runs before every test file
// adds the jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.)
// so we can write assertions the way react-testing-library examples do

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom doesn't ship matchMedia, stub it so the theme effect in App.jsx
// doesn't blow up on mount. tests that care about "system prefers dark"
// can override this with mockImplementationOnce.
window.matchMedia = vi.fn((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));
