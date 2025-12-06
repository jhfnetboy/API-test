import { useState, useRef } from 'react';
import './App.css';
import { generateImage, getTaskStatus } from './api';

function App() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const pollingRef = useRef<number | null>(null);

  const startPolling = (taskId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingRef.current = window.setInterval(async () => {
      try {
        const res = await getTaskStatus(taskId);
        console.log('Poll result:', res);
        
        if (res.code !== 10000) {
           // 10000 is usually success code for Volcengine
           // But check if the request itself failed or just status check
           if (res.code) {
             // Continue polling if code is strictly related to "Processing"? 
             // Actually Volcengine generic errors might be different.
             // Standard: 10000 = Success.
           }
        }
        
        const taskStatus = res?.data?.status;
        setStatus(taskStatus || 'UNKNOWN');

        if (taskStatus === 'SUCCESS') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setLoading(false);
          // Assuming result is in data.results[0].url
          if (res.data.results && res.data.results.length > 0) {
            setResult(res.data.results[0].url);
          } else {
            setError('Task succeeded but no image URL found.');
          }
        } else if (taskStatus === 'FAILED' || taskStatus === 'CANCELLED') {
           if (pollingRef.current) clearInterval(pollingRef.current);
           setLoading(false);
           setError(`Task failed with status: ${taskStatus}`);
        }
      } catch (err: any) {
        console.error('Polling error:', err);
        // Don't stop polling immediately on network error, maybe transient?
        // But if 404/500 repeatedly...
      }
    }, 2000);
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setStatus('SUBMITTING');

    try {
      const urls = imageUrl ? [imageUrl] : undefined;
      const res = await generateImage(prompt, urls);
      console.log('Generate response:', res);
      
      // Check for success code (10000 is typical)
      // Some APIs return code 0 or 200. Let's assume ANY successful HTTP 200 with data.id is okay.
      if (res.data && res.data.id) {
        setStatus('QUEUED');
        startPolling(res.data.id);
      } else {
        setLoading(false);
        setError(`Failed to submit task: ${res.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.details?.message || err.message || 'Submission failed');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Jimeng AI Gen</h1>
        
        <div className="input-group">
          <label>Prompt</label>
          <textarea 
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)} 
            placeholder="Enter your imagination..."
            rows={4}
          />
        </div>

        <div className="input-group">
          <label>Reference Image URL (Optional)</label>
          <input 
            type="text" 
            value={imageUrl} 
            onChange={(e) => setImageUrl(e.target.value)} 
            placeholder="https://example.com/image.jpg" 
          />
        </div>

        <button onClick={handleGenerate} disabled={loading || !prompt}>
          {loading ? 'Dreaming...' : 'Generate Art'}
        </button>

        {status && <div className="status">Status: {status}</div>}
        {error && <div className="error">{error}</div>}

        {result && (
          <div className="result-container">
            <img src={result} alt="Generated Art" className="result-image" />
            <a href={result} target="_blank" rel="noreferrer" className="download-link">View Full Size</a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
