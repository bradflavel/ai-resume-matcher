// smoke test, proves vitest + react testing library + jest-dom are all wired up
// if this fails, nothing else is going to pass either

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });

  it('can render react and find elements via testing-library', () => {
    render(<h1>hello</h1>);
    expect(screen.getByRole('heading', { name: /hello/i })).toBeInTheDocument();
  });
});
