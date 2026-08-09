import React, { useState, useEffect } from 'react';
import { Send, FileText, Clock, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { LogItem, RetrievedDocument, SystemMetrics } from '../types';

export const Playground: React.FC = () => {
  const [query, setQuery] = useState<string>('What is Retrieval-Augmented Generation?');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Results states
  const [answer, setAnswer] = useState<string>('');
  const [citations, setCitations] = useState<string[]>([]);
  const [retrievedDocs, setRetrievedDocs] = useState<RetrievedDocument[]>([]);
  const [stageLogs, setStageLogs] = useState<LogItem[]>([]);
  const [responseTime, setResponseTime] = useState<number>(0);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.75);

  // Metrics states
  const [metrics, setMetrics] = useState<SystemMetrics>({
    docs_indexed: 5,
    total_chunks: 42,
    queries_processed: 184,
    avg_retrieval_score: 0.85,
    avg_response_time_ms: 780,
    tokens_consumed: 142050,
    success_queries: 178,
    failed_queries: 6
  });

  const sampleQueries = [
    "What is hybrid search in Azure?",
    "Explain chunking overlap size parameters",
    "Why use Managed Identities for OpenAI security?",
    "Generate a summary of embedding models"
  ];

  const fetchMetrics = async () => {
    try {
      const base = window.location.port === '5173' ? 'http://127.0.0.1:8000' : '';
      const res = await fetch(`${base}/dashboard/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.warn("Failed to fetch dashboard metrics from backend", e);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsLoading(true);
    setAnswer('');
    setCitations([]);
    setRetrievedDocs([]);
    setStageLogs([]);
    
    // Optimistic log to start
    setStageLogs([{ stage: "Query Ingestion", detail: "Query received, initializing pipeline...", timestamp: Date.now() / 1000 }]);

    try {
      const base = window.location.port === '5173' ? 'http://127.0.0.1:8000' : '';
      const res = await fetch(`${base}/rag/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Filter retrieved docs by similarity threshold slider
          const filteredDocs = (data.retrieved_documents || []).filter(
            (doc: RetrievedDocument) => doc.similarity_score >= similarityThreshold
          );

          // Update logs and answers
          setStageLogs(data.logs);
          setResponseTime(data.elapsed_ms);
          setRetrievedDocs(filteredDocs);
          
          if (filteredDocs.length === 0) {
            setAnswer("Warning: Relevance threshold check failed. No document chunks exceeded your minimum similarity score threshold of " + similarityThreshold + ". Grounded completion prevented to stop hallucinations.");
            setCitations([]);
          } else {
            setAnswer(data.answer);
            setCitations(data.citations || []);
          }
        } else {
          setStageLogs(data.logs);
          setAnswer("Error: " + data.message);
        }
      } else {
        setAnswer("Connection Error: Server returned an invalid response.");
      }
    } catch {
      setAnswer("Network Error: Failed to contact the backend server api.");
    } finally {
      setIsLoading(false);
      fetchMetrics(); // Refresh stats
    }
  };

  // Prepare chart data representing latency metrics breakdown
  const chartData = [
    { name: 'Ingestion', value: 80, fill: '#0078d4' },
    { name: 'Embedding', value: 120, fill: '#005da7' },
    { name: 'Search DB', value: 150, fill: '#004780' },
    { name: 'Prompt Eng', value: 80, fill: '#7ab8ff' },
    { name: 'GPT LLM', value: 350, fill: '#10b981' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Introduction */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-azure-400 to-teal-400 bg-clip-text text-transparent">
          RAG Playground & Performance Dashboard
        </h2>
        <p className="text-slate-400 text-sm">
          Run queries against the knowledge base in real-time, view context scores, trace pipeline telemetry logs, and view server performance metrics.
        </p>
      </div>

      {/* Grid: Playground | Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Query Sandbox */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 bg-azure-500/10 text-azure-400 text-xs font-semibold rounded-bl-xl border-l border-b border-slate-800/80">
              Interactive Sandbox
            </div>
            
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-azure-400" />
              Ask RAG System
            </h3>

            {/* Template Buttons */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Suggested Queries</span>
              <div className="flex flex-wrap gap-2">
                {sampleQueries.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(q);
                      handleQuery(q);
                    }}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 rounded-lg transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Query Form */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your system question..."
                  className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-azure-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleQuery(query)}
                />
                <button
                  onClick={() => handleQuery(query)}
                  disabled={isLoading || !query.trim()}
                  className="px-5 bg-azure-500 hover:bg-azure-600 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-azure-500/10 transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Ask RAG'}
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Slider for Similarity Filtering */}
              <div className="p-3 bg-slate-950/45 rounded-xl border border-slate-800/80 flex items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Min Similarity Threshold</span>
                  <p className="text-[9px] text-slate-500 leading-snug">Excludes chunks with low semantic scores.</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.50"
                    max="0.95"
                    step="0.05"
                    value={similarityThreshold}
                    onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                    className="accent-azure-500"
                  />
                  <span className="text-xs font-bold text-azure-400 font-mono">{(similarityThreshold * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Answer Display */}
            {answer && (
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Grounded Answer</h4>
                  <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans shadow-inner">
                    {answer}
                  </div>
                </div>

                {citations.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Source Citations</h4>
                    <div className="flex flex-wrap gap-2">
                      {citations.map((cite, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-md text-[10px] font-bold text-teal-400">
                          <FileText className="w-3.5 h-3.5" />
                          {cite}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pipeline Stage Tracker */}
            {stageLogs.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-800/80">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Processing Logs</span>
                  {responseTime > 0 && <span className="text-azure-400 font-mono text-[9px]">Completed in {responseTime}ms</span>}
                </h4>
                <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-[10px] max-h-40 overflow-y-auto">
                  {stageLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-slate-500">[{new Date(log.timestamp * 1000).toLocaleTimeString()}]</span>
                      <span className="text-azure-400 font-bold">[{log.stage}]:</span>
                      <span className="text-slate-300">{log.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chunks Relevance Info */}
            {retrievedDocs.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-800/80">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Retrieved Context Scores</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {retrievedDocs.map((doc, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-750 transition-colors flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400 truncate max-w-[70%]">{doc.title}</span>
                          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold font-mono text-[9px] rounded">
                            {(doc.similarity_score * 100).toFixed(0)}% Match
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 line-clamp-3 leading-relaxed">{doc.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Performance Metrics */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between gap-2 border-l-2 border-l-azure-500">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Indexed Documents</span>
              <div>
                <span className="text-2xl font-black text-slate-100 font-mono">{metrics.docs_indexed}</span>
                <span className="text-[9px] text-slate-500 block">({metrics.total_chunks} chunks indexed)</span>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between gap-2 border-l-2 border-l-teal-500">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Response Latency</span>
              <div>
                <span className="text-2xl font-black text-slate-100 font-mono">{metrics.avg_response_time_ms} ms</span>
                <span className="text-[9px] text-slate-500 block">(FastAPI processing time)</span>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between gap-2 border-l-2 border-l-emerald-500">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total API Queries</span>
              <div>
                <span className="text-2xl font-black text-slate-100 font-mono">{metrics.queries_processed}</span>
                <span className="text-[9px] text-slate-500 block">({metrics.success_queries} successful requests)</span>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between gap-2 border-l-2 border-l-indigo-500">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Retrieval Score</span>
              <div>
                <span className="text-2xl font-black text-slate-100 font-mono">{(metrics.avg_retrieval_score * 100).toFixed(0)}%</span>
                <span className="text-[9px] text-slate-500 block">(Cosine similarity)</span>
              </div>
            </div>
          </div>

          {/* Recharts Latency Breakdown */}
          <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-azure-400" />
              Simulated Latency Breakdown (ms)
            </h3>

            <div className="h-56 w-full text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
                    labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                    itemStyle={{ color: '#0078d4' }}
                  />
                  <Bar dataKey="value" fill="#0078d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <p className="text-[10px] text-slate-500 leading-snug">
              *The breakdown chart highlights token processing latency overhead: Generative Completion models (GPT-4) typically demand around 60% of runtime processing loops compared to local indexing searches.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
