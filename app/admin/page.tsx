
'use client';

import React, { useState } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [textData, setTextData] = useState('');
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  const handleTrain = async () => {
    if (!textData.trim()) return;
    
    setIsProcessing(true);
    setStatus('Processing...');

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: textData,
          password: password // Send password for server-side verify
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(`Success: ${data.message}`);
        setTextData('');
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error: any) {
      setStatus(`Network Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <form onSubmit={handleLogin} className="p-8 bg-slate-900 rounded-xl border border-slate-800 shadow-xl w-full max-w-md">
          <h1 className="text-xl font-bold mb-4 text-emerald-500">Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
            className="w-full p-3 mb-6 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-emerald-500 outline-none transition-colors"
          />
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium p-3 rounded-lg transition-colors">
            Access Admin Panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-emerald-500 tracking-tight">Knowledge Base Admin</h1>
          <div className="flex gap-4">
             <a href="/" className="text-sm text-slate-400 hover:text-white transition-colors py-2">Back to Chat</a>
             <button 
                onClick={() => setIsAuthenticated(false)}
                className="text-sm bg-slate-800 px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
             >
                Logout
             </button>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            Ingest New Data
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Paste financial reports, CBM policy documents, or market news here. 
            The system will:
            <ul className="list-disc list-inside mt-2 ml-1 text-slate-500">
                <li>Split text into manageable chunks</li>
                <li>Generate embeddings using Gemini (text-embedding-004)</li>
                <li>Store vectors in Supabase for RAG retrieval</li>
            </ul>
          </p>

          <textarea
            value={textData}
            onChange={(e) => setTextData(e.target.value)}
            placeholder="Paste text content here (e.g., 'CBM Notification No. 15/2024...')"
            className="w-full h-64 p-4 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:border-emerald-500 outline-none resize-none mb-6 font-mono"
          />

          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <span className={`text-sm font-medium ${status.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
              {status}
            </span>
            <button
              onClick={handleTrain}
              disabled={isProcessing || !textData.trim()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                isProcessing || !textData.trim()
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
              }`}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Upload & Train'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
