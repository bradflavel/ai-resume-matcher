// tests for StructuredResult
// component now consumes validated JSON directly, no parsing to test

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StructuredResult from './StructuredResult.jsx';
import { fullResult, scoreOnly, matchesOnly } from './test/fixtures/ai-output.js';

describe('StructuredResult — full result object', () => {
  it('shows the score', () => {
    render(<StructuredResult result={fullResult} />);
    expect(screen.getByText(/82 \/ 100/)).toBeInTheDocument();
  });

  it('renders every Key Matching Points item', () => {
    render(<StructuredResult result={fullResult} />);
    expect(screen.getByText(/5 years of Node\.js experience/)).toBeInTheDocument();
    expect(screen.getByText(/Led a small engineering team/)).toBeInTheDocument();
    expect(screen.getByText(/Strong CI\/CD background/)).toBeInTheDocument();
  });

  it('renders every Weak or Missing Qualifications item', () => {
    render(<StructuredResult result={fullResult} />);
    expect(screen.getByText(/No AWS exposure/)).toBeInTheDocument();
    expect(screen.getByText(/Limited AI\/ML background/)).toBeInTheDocument();
  });

  it('renders every Suggestions for Improvement item', () => {
    render(<StructuredResult result={fullResult} />);
    expect(screen.getByText(/Add a cloud project to GitHub/)).toBeInTheDocument();
    expect(screen.getByText(/Take a short ML course/)).toBeInTheDocument();
  });

  it('shows all four section headings', () => {
    render(<StructuredResult result={fullResult} />);
    expect(screen.getByRole('heading', { name: /Match Score/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Key Matching Points/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Weak or Missing Qualifications/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Suggestions for Improvement/i })).toBeInTheDocument();
  });
});

describe('StructuredResult — partial results', () => {
  it('renders only the score block when all bullet arrays are empty', () => {
    render(<StructuredResult result={scoreOnly} />);
    expect(screen.getByText(/40 \/ 100/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Key Matching Points/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Weak or Missing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Suggestions/i })).not.toBeInTheDocument();
  });

  it('renders only the populated sections when some bullet arrays are empty', () => {
    render(<StructuredResult result={matchesOnly} />);
    expect(screen.getByRole('heading', { name: /Key Matching Points/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Weak or Missing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Suggestions/i })).not.toBeInTheDocument();
  });
});

describe('StructuredResult — edge cases', () => {
  it('renders nothing when result is null', () => {
    const { container } = render(<StructuredResult result={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when result is undefined', () => {
    const { container } = render(<StructuredResult />);
    expect(container.firstChild).toBeNull();
  });

  it('tolerates a result missing arrays, no crash', () => {
    // defensive path, structured outputs should make this impossible in practice
    const { container } = render(<StructuredResult result={{ score: 50 }} />);
    expect(screen.getByText(/50 \/ 100/)).toBeInTheDocument();
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });
});
