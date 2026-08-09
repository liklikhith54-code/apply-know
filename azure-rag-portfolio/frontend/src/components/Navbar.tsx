import React, { useEffect, useState } from 'react';
import { Cpu, RefreshCw } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const [healthStatus, setHealthStatus] = useState<{ mode: string; isHealthy: boolean }>({
    mode: "Checking connection...",
    isHealthy: false
  });

  const fetchHealth = async () => {
    try {
      const base = window.location.port === '5173' ? 'http://127.0.0.1:8000' : '';
      const res = await fetch(`${base}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthStatus({
          mode: data.mode,
          isHealthy: true
        });
      } else {
        setHealthStatus({ mode: "API Error Connection", isHealthy: false });
      }
    } catch {
      setHealthStatus({ mode: "Local Backend Offline", isHealthy: false });
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'home', label: 'Overview' },
    { id: 'architecture', label: 'Interactive Architecture' },
    { id: 'ingestion', label: 'RAG Pipeline' },
    { id: 'playground', label: 'RAG Playground & Metrics' },
    { id: 'debugger', label: 'Debugging Lab' },
    { id: 'security', label: 'Security & Deployment' }
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 shadow-lg px-4 md:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-azure-500/10 border border-azure-500/30 text-azure-400">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-50 tracking-tight leading-none">Azure AI + RAG Architecture</h1>
            <p className="text-[11px] text-slate-400 mt-1">Implementation & Problem Solving Portfolio</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap items-center justify-center gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800/50">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-azure-500 text-white shadow-md shadow-azure-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchHealth}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-950 transition-colors"
            title="Refresh connection status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold ${
            healthStatus.isHealthy 
              ? healthStatus.mode.includes("Demo") 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              healthStatus.isHealthy 
                ? healthStatus.mode.includes("Demo") 
                  ? 'bg-amber-400' 
                  : 'bg-emerald-400'
                : 'bg-rose-400 animate-ping'
            }`} />
            {healthStatus.mode}
          </div>
        </div>
      </div>
    </header>
  );
};
