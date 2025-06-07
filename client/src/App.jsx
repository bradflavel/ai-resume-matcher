import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobAdUrl, setJobAdUrl] = useState('');
  const [result, setResult] = useState('');

  const handleSubmit = async () => {
    if (!resumeFile || !jobAdUrl) {
      setResult('Please upload a resume and enter a job ad URL.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('jobAdUrl', jobAdUrl);

    setResult('Analyzing...');

    try {
      const response = await axios.post('https://resume-matcher-backend-z0h9.onrender.com/api/match-pdf-url', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data.result);
    } catch (err) {
      setResult('Error: ' + err.message);
    }
  };

  return (
    <div className="container">
      <h1>AI Resume Matcher</h1>
      <label>Upload Resume (PDF)</label>
      <input type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files[0])} />

      <label>Paste Job Ad URL</label>
      <input type="text" value={jobAdUrl} onChange={(e) => setJobAdUrl(e.target.value)} placeholder="https://..." />

      <button onClick={handleSubmit}>Analyze Match</button>
      <pre>{result}</pre>
    </div>
  );
}

export default App;
