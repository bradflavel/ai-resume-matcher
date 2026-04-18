// tests for StructuredResult
// we test via rendered DOM rather than calling the parser directly,
// that way tests survive a future refactor that swaps parsing for backend JSON

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StructuredResult from './StructuredResult.jsx';
import {
  fullOutput,
  withStepPrefix,
  numberedBullets,
  scoreOnly,
  missingScore,
  garbage,
  empty,
} from './test/fixtures/ai-output.js';

describe('StructuredResult — full AI output', () => {
  it('shows the score', () => {
    render(<StructuredResult rawText={fullOutput} />);
    expect(screen.getByText(/Suitability Score:\s*82/)).toBeInTheDocument();
  });

  it('renders all three Key Matching Points', () => {
    render(<StructuredResult rawText={fullOutput} />);
    expect(screen.getByText(/5 years of Node\.js experience/)).toBeInTheDocument();
    expect(screen.getByText(/Led a small engineering team/)).toBeInTheDocument();
    expect(screen.getByText(/Strong CI\/CD background/)).toBeInTheDocument();
  });

  it('renders Weak or Missing Qualifications', () => {
    render(<StructuredResult rawText={fullOutput} />);
    expect(screen.getByText(/No AWS exposure/)).toBeInTheDocument();
    expect(screen.getByText(/Limited AI\/ML background/)).toBeInTheDocument();
  });

  it('renders Suggestions for Improvement', () => {
    render(<StructuredResult rawText={fullOutput} />);
    expect(screen.getByText(/Add a cloud project to GitHub/)).toBeInTheDocument();
    expect(screen.getByText(/Take a short ML course/)).toBeInTheDocument();
  });

  it('shows all four section headings', () => {
    render(<StructuredResult rawText={fullOutput} />);
    // job summary is hidden when there's no Step 1 prefix, we expect only 3 headings here
    expect(screen.getByRole('heading', { name: /Match Score/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Key Matching Points/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Weak or Missing Qualifications/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Suggestions for Improvement/i })).toBeInTheDocument();
  });
});

describe('StructuredResult — Step 1 legacy prefix', () => {
  it('extracts the job title from the Step 1 line', () => {
    render(<StructuredResult rawText={withStepPrefix} />);
    expect(screen.getByRole('heading', { name: /Job Summary/i })).toBeInTheDocument();
    expect(screen.getByText(/Senior Node\.js Engineer/)).toBeInTheDocument();
  });

  it('does not show Job Summary when the Step 1 prefix is absent', () => {
    render(<StructuredResult rawText={fullOutput} />);
    expect(screen.queryByRole('heading', { name: /Job Summary/i })).not.toBeInTheDocument();
  });
});

describe('StructuredResult — bullet shapes', () => {
  it('accepts numbered bullets just like dashes', () => {
    render(<StructuredResult rawText={numberedBullets} />);
    expect(screen.getByText(/Good architectural taste/)).toBeInTheDocument();
    expect(screen.getByText(/Strong testing habits/)).toBeInTheDocument();
    expect(screen.getByText(/No Kubernetes experience/)).toBeInTheDocument();
    expect(screen.getByText(/Earn a CKA cert/)).toBeInTheDocument();
  });
});

describe('StructuredResult — partial / messy input', () => {
  it('shows only the score when no section bodies are present', () => {
    render(<StructuredResult rawText={scoreOnly} />);
    expect(screen.getByText(/Suitability Score:\s*40/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Key Matching Points/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Weak or Missing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Suggestions/i })).not.toBeInTheDocument();
  });

  it('renders other sections when the score line is missing', () => {
    render(<StructuredResult rawText={missingScore} />);
    expect(screen.queryByRole('heading', { name: /Match Score/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Sharp resume/)).toBeInTheDocument();
    expect(screen.getByText(/Clean writing/)).toBeInTheDocument();
    expect(screen.getByText(/No score provided/)).toBeInTheDocument();
  });

  it('renders nothing visible for garbage input, no crash', () => {
    const { container } = render(<StructuredResult rawText={garbage} />);
    expect(container.querySelectorAll('h3')).toHaveLength(0);
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  it('renders nothing visible for an empty string, no crash', () => {
    const { container } = render(<StructuredResult rawText={empty} />);
    expect(container.querySelectorAll('h3')).toHaveLength(0);
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });
});
