// smoke test, proves vitest is wired up before anything else depends on it
// if this fails the whole suite is broken, don't bother debugging real tests

import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
