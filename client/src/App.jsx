import { useEffect, useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import StructuredResult from './StructuredResult';

function App() {
  // File state for the uploaded resume
  const [resumeFile, setResumeFile] = useState(null);
  // Stores either the job ad URL or the job ad text (depending on mode)
  const [jobAdInput, setJobAdInput] = useState('');
  // "link" = paste job ad URL, "text" = paste full job ad text
  const [inputMode, setInputMode] = useState('link');
  // The AI’s analysis result
  const [result, setResult] = useState('');
  // Whether the analysis is currently running
  const [loading, setLoading] = useState(false);
  // Tracks light/dark mode
  const [darkMode, setDarkMode] = useState(false);

  // Backend API base URL (falls back to localhost for local dev)
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // On first render: detect system theme and set app theme accordingly
  useEffect(() => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(systemPrefersDark);
    document.documentElement.classList.toggle('dark', systemPrefersDark);
  }, []);

  // Toggles between light and dark mode manually
  const toggleTheme = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      document.documentElement.classList.toggle('dark', newMode);
      return newMode;
    });
  };

  // Handles sending the resume + job ad to the backend for analysis
  const handleSubmit = async () => {
    // Quick validation
    if (!resumeFile || !jobAdInput) {
      toast.error('Please upload a resume and enter job ad information.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('inputMode', inputMode);
    formData.append(inputMode === 'link' ? 'jobAdUrl' : 'jobAdText', jobAdInput);

    setLoading(true);
    // DO NOT clear result here; keep the old one visible on failure

    try {
      const response = await axios.post(`${API_BASE}/api/match-pdf-url`, formData);

      console.log('HTTP', response.status, response.data);
      const text = response.data?.result || '';
      console.log('result length', text.length);

      if (!text) {
        toast.error('No analysis returned. Try a smaller PDF or try again.');
        return;
      }

      setResult(text); // only set when non-empty
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className={`${darkMode ? 'dark' : ''} font-sans min-h-screen flex flex-col`}>
      {/* Top bar with title and theme toggle */}
      <header className="px-6 py-4 bg-muted flex justify-between items-center border-b border-border">
        <h1 className="text-lg font-bold tracking-tight">AI Resume Matcher</h1>
        <button
          onClick={toggleTheme}
          className="text-xs px-3 py-1 rounded border border-border bg-background hover:bg-muted transition"
        >
          {darkMode ? 'Dark' : 'Light'}
        </button>
      </header>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-10 px-4 pt-16 pb-10">
          {/* Left panel: resume upload + job ad input */}
          <div className="basis-[25%] min-w-[300px] bg-card border border-border p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Upload Resume (PDF)</h2>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setResumeFile(e.target.files[0])}
              className="w-full text-foreground mb-2"
            />
            {resumeFile && (
              <p className="text-sm text-green-500 mb-4 truncate">
                Selected: {resumeFile.name}
              </p>
            )}

            {/* Choose between URL input or full text paste */}
            <div className="flex items-center gap-4 mb-2">
              <label className="font-semibold">Job Ad Input Mode:</label>
              <select
                value={inputMode}
                onChange={(e) => setInputMode(e.target.value)}
                className="border border-border rounded bg-background text-foreground p-1"
              >
                <option value="link">Paste Link</option>
                <option value="text">Paste Full Text</option>
              </select>
            </div>

            {/* Conditional render: input or textarea depending on mode */}
            {inputMode === 'link' ? (
              <input
                type="text"
                value={jobAdInput}
                onChange={(e) => setJobAdInput(e.target.value)}
                placeholder="https://..."
                className="w-full p-2 rounded bg-background border border-border text-foreground"
              />
            ) : (
              <textarea
                rows={8}
                value={jobAdInput}
                onChange={(e) => setJobAdInput(e.target.value)}
                placeholder="Paste full job ad text here..."
                className="w-full p-2 rounded bg-background border border-border text-foreground"
              />
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              className="mt-4 w-full px-4 py-2 bg-primary text-primary-foreground font-medium rounded hover:opacity-90 transition"
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Analyze Match'}
            </button>

            {/* Spinner while processing */}
            {loading && (
              <div className="mt-4 animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 border-solid mx-auto" />
            )}
          </div>

          {/* Right panel: AI analysis results */}
          <div className="basis-[55%] flex-grow min-h-[500px] bg-card border border-border p-6 rounded-lg shadow overflow-x-auto">
            <h2 className="text-lg font-semibold mb-4">Result:</h2>
            {result ? (
              <StructuredResult rawText={result} />
            ) : (
              <p className="text-muted-foreground text-sm italic">No result yet.</p>
            )}
          </div>
        </div>
      </main>

      {/* Footer with simple credit */}
      <footer className="text-center text-xs py-4 bg-muted text-muted-foreground border-t border-border">
        &copy; {new Date().getFullYear()} AI Resume Matcher by Brad Flavel
      </footer>

      {/* Toast notifications container */}
      <ToastContainer />
    </div>
  );
}

export default App;
