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
        }
        
        const taskStatus = res?.data?.status;
        setStatus(taskStatus || 'UNKNOWN');

        if (taskStatus === 'SUCCESS') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setLoading(false);
          // Assuming result is in data.results[0].url
          if (res.data.results && res.data.results.length > 0) {
            setResult(res.data.results[0].url);
          } else if (res.data.image_urls && res.data.image_urls.length > 0) {
             // Fallback for different response structures
             setResult(res.data.image_urls[0]);
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
      
      if (res.code === 10000 && res.data && res.data.task_id) {
        setStatus('QUEUED');
        startPolling(res.data.task_id);
      } else {
        setLoading(false);
        setError(`Failed to submit task: ${res.message || 'Unknown error'} (Code: ${res.code})`);
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
          <p style={{fontSize: '0.8rem', color: '#666', marginTop: '0.2rem'}}>
            * The API requires a public URL (http/https). Local file uploads are not supported directly.
          </p>
        </div>

        <button onClick={handleGenerate} disabled={loading || !prompt} className="generate-btn">
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
