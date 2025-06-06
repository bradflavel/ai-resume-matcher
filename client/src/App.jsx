import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [resume, setResume] = useState('');
  const [jobAd, setJobAd] = useState('');
  const [result, setResult] = useState('');

  const handleSubmit = async () => {
    setResult('Loading...');
    try {
      const response = await axios.post('http://localhost:3001/api/match', {
        resume,
        jobAd,
      });
      setResult(response.data.result);
    } catch (err) {
      setResult('Error: ' + err.message);
    }
  };

  return (
    <div className="container">
      <h1>AI Resume Matcher</h1>
      <textarea
        placeholder="Paste your resume here..."
        value={resume}
        onChange={(e) => setResume(e.target.value)}
      />
      <textarea
        placeholder="Paste the job ad here..."
        value={jobAd}
        onChange={(e) => setJobAd(e.target.value)}
      />
      <button onClick={handleSubmit}>Match Resume to Job Ad</button>
      <pre>{result}</pre>
    </div>
  );
}

export default App;
