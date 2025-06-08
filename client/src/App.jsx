import { useEffect, useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import StructuredResult from './StructuredResult';

function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobAdUrl, setJobAdUrl] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(systemPrefersDark);
    document.documentElement.classList.toggle('dark', systemPrefersDark);
  }, []);

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      document.documentElement.classList.toggle('dark', newMode);
      return newMode;
    });
  };

  const handleSubmit = async () => {
    if (!resumeFile || !jobAdUrl) {
      toast.error('Please upload a resume and enter a job ad URL.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('jobAdUrl', jobAdUrl);

    setLoading(true);
    setResult('');
    

    try {
      const response = await axios.post(`${API_BASE}/api/match-pdf-url`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('🧠 Raw AI response:', response.data.result);

      setResult(response.data.result);
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${darkMode ? 'dark' : ''} font-sans`}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="px-6 py-4 bg-muted flex justify-between items-center border-b border-border">
          <h1 className="text-lg font-bold tracking-tight">AI Resume Matcher</h1>
          <button
            onClick={toggleTheme}
            className="text-xs px-3 py-1 rounded border border-border bg-background hover:bg-muted transition"
          >
            {darkMode ? 'Dark' : 'Light'}
          </button>
        </header>

        <main className="flex-grow px-4 pt-16 pb-10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-10 items-start">
            {/* Upload Form */}
            <div className="flex-1 bg-card border border-border p-6 rounded-lg shadow">
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

              <label className="block font-semibold mb-2">Paste Job Ad URL</label>
              <input
                type="text"
                value={jobAdUrl}
                onChange={(e) => setJobAdUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-2 rounded bg-background border border-border text-foreground"
              />

              <button
                onClick={handleSubmit}
                className="mt-4 w-full px-4 py-2 bg-primary text-primary-foreground font-medium rounded hover:opacity-90 transition"
                disabled={loading}
              >
                {loading ? 'Analyzing...' : 'Analyze Match'}
              </button>

              {loading && (
                <div className="mt-4 animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 border-solid mx-auto" />
              )}
            </div>

            {/* Results */}
            <div className="flex-1 bg-card border border-border p-6 rounded-lg shadow overflow-x-auto">
              <h2 className="text-lg font-semibold mb-4">Result:</h2>
              {result ? (
                <StructuredResult rawText={result} />
              ) : (
                <p className="text-muted-foreground text-sm italic">No result yet.</p>
              )}
            </div>
          </div>
        </main>

        <footer className="text-center text-xs py-4 bg-muted text-muted-foreground border-t border-border">
          &copy; {new Date().getFullYear()} AI Resume Matcher by Brad Flavel
        </footer>

        <ToastContainer />
      </div>
    </div>
  );
}

export default App;
