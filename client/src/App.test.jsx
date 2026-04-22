// tests for the App component
// mocks axios and react-toastify so we can assert on what the UI does
// without actually hitting the network or rendering a toast stack

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

// hoisted so these refs exist when vi.mock factories run
const mocks = vi.hoisted(() => ({
  axiosPost: vi.fn(),
  toastError: vi.fn(),
}));

// swap axios for a stub, App calls axios.post(url, formData)
vi.mock('axios', () => ({
  default: { post: mocks.axiosPost },
}));

// swap react-toastify, ToastContainer becomes a no-op to keep the DOM tidy
vi.mock('react-toastify', () => ({
  toast: { error: mocks.toastError },
  ToastContainer: () => null,
}));

// small helper, the file input has no label so querySelector is the cleanest query
function getFileInput(container) {
  return container.querySelector('input[type="file"]');
}

// build a fake PDF file for upload tests
function makePdf(name = 'resume.pdf') {
  return new File(['fake-pdf-bytes'], name, { type: 'application/pdf' });
}

beforeEach(() => {
  vi.clearAllMocks();
  // reset the dark class between tests, the theme toggle test mutates it
  document.documentElement.classList.remove('dark');
  // default happy-path axios response, individual tests override when needed
  mocks.axiosPost.mockResolvedValue({
    status: 200,
    data: { result: 'Suitability Score: 80\n\n(test result body)' },
  });
});

describe('App — initial render', () => {
  it('renders the title and the analyze button', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /AI Resume Matcher/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze Match/i })).toBeInTheDocument();
  });

  it('shows the placeholder message before any submission', () => {
    render(<App />);
    expect(screen.getByText(/No result yet/i)).toBeInTheDocument();
  });
});

describe('App — file upload', () => {
  it('shows the selected filename after a user picks a PDF', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.upload(getFileInput(container), makePdf('brad-resume.pdf'));
    expect(screen.getByText(/Selected:\s*brad-resume\.pdf/i)).toBeInTheDocument();
  });
});

describe('App — input mode toggle', () => {
  it('swaps the URL input for a textarea when mode changes to text', async () => {
    const user = userEvent.setup();
    render(<App />);

    // starts on "link" mode, URL input is visible
    expect(screen.getByPlaceholderText(/https:\/\//)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Paste full job ad text/i)).not.toBeInTheDocument();

    // flip the dropdown to text mode
    await user.selectOptions(screen.getByRole('combobox'), 'text');

    // now the textarea should be there, URL input gone
    expect(screen.queryByPlaceholderText(/https:\/\//)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste full job ad text/i)).toBeInTheDocument();
  });
});

describe('App — theme toggle', () => {
  it('adds the dark class on <html> when the user clicks the theme button', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    await user.click(screen.getByRole('button', { name: /Light/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('picks up the system theme on first render when dark is preferred', () => {
    // override matchMedia for this test only
    window.matchMedia.mockImplementationOnce((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    render(<App />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

describe('App — submit validation', () => {
  it('shows a toast and skips the network call when no resume is selected', async () => {
    const user = userEvent.setup();
    render(<App />);

    // put something in the URL field so the only missing thing is the file
    await user.type(screen.getByPlaceholderText(/https:\/\//), 'https://example.com/job');
    await user.click(screen.getByRole('button', { name: /Analyze Match/i }));

    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    expect(mocks.axiosPost).not.toHaveBeenCalled();
  });

  it('shows a toast and skips the network call when no job ad info is entered', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    // attach a file but leave the URL empty
    await user.upload(getFileInput(container), makePdf());
    await user.click(screen.getByRole('button', { name: /Analyze Match/i }));

    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    expect(mocks.axiosPost).not.toHaveBeenCalled();
  });
});

describe('App — submit happy path', () => {
  it('posts to the API and renders the result text', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.upload(getFileInput(container), makePdf());
    await user.type(screen.getByPlaceholderText(/https:\/\//), 'https://example.com/job');
    await user.click(screen.getByRole('button', { name: /Analyze Match/i }));

    expect(mocks.axiosPost).toHaveBeenCalledTimes(1);
    // FormData is the second arg, just check the URL shape of the first arg
    expect(mocks.axiosPost.mock.calls[0][0]).toMatch(/\/api\/match-pdf-url$/);

    expect(await screen.findByText(/\(test result body\)/i)).toBeInTheDocument();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });
});

describe('App — submit failures', () => {
  it('shows an error toast when axios rejects with a server message', async () => {
    mocks.axiosPost.mockRejectedValue({
      response: { data: { error: 'File too large.' } },
    });
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.upload(getFileInput(container), makePdf());
    await user.type(screen.getByPlaceholderText(/https:\/\//), 'https://example.com/job');
    await user.click(screen.getByRole('button', { name: /Analyze Match/i }));

    // wait for the mock to have been called, then assert the toast
    expect(mocks.axiosPost).toHaveBeenCalledTimes(1);
    // await a tick so the rejection handler runs
    await new Promise((r) => setTimeout(r, 0));
    expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining('File too large.'));
  });

  it('shows an error toast when the API returns an empty result', async () => {
    mocks.axiosPost.mockResolvedValue({ status: 200, data: { result: '' } });
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.upload(getFileInput(container), makePdf());
    await user.type(screen.getByPlaceholderText(/https:\/\//), 'https://example.com/job');
    await user.click(screen.getByRole('button', { name: /Analyze Match/i }));

    await new Promise((r) => setTimeout(r, 0));
    expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/No analysis returned/i));
  });
});

describe('App — loading state', () => {
  it('disables the button and switches its label while the request is in-flight', async () => {
    // hold the request open so we can observe the in-flight state
    let resolveIt;
    mocks.axiosPost.mockImplementation(
      () => new Promise((res) => { resolveIt = res; }),
    );

    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.upload(getFileInput(container), makePdf());
    await user.type(screen.getByPlaceholderText(/https:\/\//), 'https://example.com/job');
    await user.click(screen.getByRole('button', { name: /Analyze Match/i }));

    const button = screen.getByRole('button', { name: /Analyzing/i });
    expect(button).toBeDisabled();

    // let the request finish so the test can unwind cleanly
    resolveIt({ status: 200, data: { result: 'done' } });
  });
});
