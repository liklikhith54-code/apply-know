import { useState } from 'react';
import { ArrowRight, Database, Settings, Mail, Cpu } from 'lucide-react';

import { Navbar } from './components/Navbar';
import { Architecture } from './components/Architecture';
import { Implementation } from './components/Implementation';
import { Playground } from './components/Playground';
import { Debugger } from './components/Debugger';
import { Security } from './components/Security';

function App() {
  const [activeTab, setActiveTab] = useState<string>('home');

  const techStack = {
    azure: [
      { name: "Azure OpenAI", desc: "Embeddings generation & GPT generation" },
      { name: "Azure AI Search", desc: "Vector indexing & Hybrid retrieval" },
      { name: "Azure Blob Storage", desc: "Document ingestion data store" },
      { name: "Azure App Service", desc: "Hosting FastAPI backend API" }
    ],
    ai: [
      { name: "LLM (GPT-4)", desc: "Synthesizing grounded context" },
      { name: "Vector Embeddings", desc: "text-embedding-ada-002 model" },
      { name: "Semantic Search", desc: "L2 distance rank and semantic reranker" },
      { name: "Prompt Engineering", desc: "Demarcated instructions templates" }
    ],
    development: [
      { name: "FastAPI / Python", desc: "High performance backend server" },
      { name: "React / TS / Tailwind", desc: "Interactive frontend interface" },
      { name: "GitHub Actions", desc: "CI/CD deployment automation" },
      { name: "Environment Variables", desc: "Entra ID & credential isolation" }
    ]
  };

  const useCases = [
    {
      title: "Enterprise Knowledge Base",
      desc: "Connects cross-department document servers, wikis, and manuals into a single grounded conversational interface."
    },
    {
      title: "Technical Documentation Assistant",
      desc: "Allows engineers to ask complex system setup questions and instantly get answers mapped to page code citations."
    },
    {
      title: "HR & Policy Copilot",
      desc: "Assists employees in navigating benefit guidelines, leave requests, and code of conduct manuals groundedly."
    },
    {
      title: "Customer Support Dashboard",
      desc: "Searches past issue resolutions and product manuals to draft agent responses, improving response speed."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative selection:bg-azure-500 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-azure-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-20 right-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[150px] pointer-events-none -z-10" />

      {/* Global Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8">
        {activeTab === 'home' && (
          <div className="space-y-16 animate-fadeIn">
            {/* 1. Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-azure-500/10 border border-azure-500/25 text-azure-400 text-xs font-bold">
                  <Cpu className="w-3.5 h-3.5" />
                  Portfolio Showcase
                </div>

                <div className="space-y-3">
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-slate-50">
                    Azure AI + RAG <br />
                    <span className="bg-gradient-to-r from-azure-400 via-azure-500 to-teal-400 bg-clip-text text-transparent">
                      System Architecture
                    </span>
                  </h1>
                  <h2 className="text-lg md:text-xl font-semibold text-slate-400">
                    Architecture • Implementation • Problem Solving
                  </h2>
                </div>

                <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl">
                  Hi, I am a Cloud Systems & AI Engineer. This website demonstrates my knowledge of building production-grade Retrieval-Augmented Generation (RAG) pipelines, integrating Azure OpenAI, vector search indexing, secure configurations, and resolving system debugging faults.
                </p>

                <div className="flex flex-wrap gap-4 pt-2">
                  <button
                    onClick={() => setActiveTab('architecture')}
                    className="px-6 py-3.5 bg-azure-500 hover:bg-azure-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-azure-500/10 flex items-center gap-2 transition-all hover:translate-x-0.5"
                  >
                    Explore Architecture
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveTab('ingestion')}
                    className="px-6 py-3.5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-extrabold text-xs rounded-xl transition-all"
                  >
                    View Implementation
                  </button>
                </div>
              </div>

              {/* Hero Graphic Visualizer */}
              <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
                <div className="w-full max-w-[360px] aspect-square rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 flex flex-col justify-between shadow-2xl relative">
                  {/* Glowing card dot */}
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-azure-400 animate-ping" />
                  
                  <div>
                    <span className="text-[10px] font-bold text-azure-400 uppercase tracking-widest block mb-1">RAG Pipeline Simulator</span>
                    <h3 className="text-sm font-bold text-slate-200">Grounded LLM Telemetry</h3>
                  </div>

                  {/* Flow blocks */}
                  <div className="space-y-3 py-4">
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850 text-left">
                      <div className="text-[9px] text-slate-500 uppercase font-semibold">User Query Input</div>
                      <div className="text-[10px] font-mono text-slate-300 truncate mt-0.5">What security roles exist?</div>
                    </div>
                    <div className="p-2.5 bg-azure-500/10 rounded-xl border border-azure-500/20 text-left animate-azure-pulse">
                      <div className="text-[9px] text-azure-400 uppercase font-semibold flex items-center justify-between">
                        <span>Azure AI Search Hit</span>
                        <span>Cosine 0.88</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-300 truncate mt-0.5">doc-04: managed-identities.pdf</div>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850 text-left">
                      <div className="text-[9px] text-slate-500 uppercase font-semibold">GPT-4 Grounded Completion</div>
                      <div className="text-[10px] font-mono text-emerald-400 truncate mt-0.5">Azure RBAC roles protect... [doc-04]</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-850 pt-2 font-mono">
                    <span>Latency: 760ms</span>
                    <span>Tokens: 620</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Technology Stack */}
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-100">Technology Directory</h3>
                <p className="text-slate-400 text-xs">A breakdown of tools and cloud components utilized in this RAG architecture.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Azure Stack */}
                <div className="glass-panel p-6 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-azure-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-850 pb-2">
                    <Database className="w-4 h-4" />
                    Azure Cloud Services
                  </h4>
                  <div className="space-y-3">
                    {techStack.azure.map((item, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-400 leading-snug">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Stack */}
                <div className="glass-panel p-6 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-teal-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-850 pb-2">
                    <Cpu className="w-4 h-4" />
                    AI & RAG Core
                  </h4>
                  <div className="space-y-3">
                    {techStack.ai.map((item, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-400 leading-snug">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Development Stack */}
                <div className="glass-panel p-6 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-850 pb-2">
                    <Settings className="w-4 h-4" />
                    Backend & Frontend Code
                  </h4>
                  <div className="space-y-3">
                    {techStack.development.map((item, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-400 leading-snug">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Why RAG instead of Fine-Tuning Comparison */}
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-100">Why RAG instead of Fine-Tuning?</h3>
                <p className="text-slate-400 text-xs">Understanding architectural trade-offs for custom LLM configurations.</p>
              </div>

              <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-850">
                      <th className="p-4 font-bold text-slate-300 uppercase tracking-wider">Feature Criterion</th>
                      <th className="p-4 font-bold text-azure-400 uppercase tracking-wider">RAG Ingestion</th>
                      <th className="p-4 font-bold text-teal-400 uppercase tracking-wider">Model Fine-Tuning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300 leading-relaxed">
                    <tr>
                      <td className="p-4 font-bold text-slate-200">Knowledge Update Frequency</td>
                      <td className="p-4">**Real-Time**: Instantly indexes new document updates.</td>
                      <td className="p-4 text-slate-450">**Delayed**: Requires compute-intensive retraining cycles.</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-slate-200">Grounded Citations</td>
                      <td className="p-4">**Inherent**: Easily points to source filename chunks.</td>
                      <td className="p-4 text-slate-450">**Difficult**: Synapses output facts without trace source records.</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-slate-200">Data Privacy Integration</td>
                      <td className="p-4">**Granular**: Filters indices search using standard user IAM.</td>
                      <td className="p-4 text-slate-450">**None**: All trained data is hardcoded inside parameters.</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-slate-200">Model Hallucination Controls</td>
                      <td className="p-4">**High**: System prompts restrict outputs to context bounds.</td>
                      <td className="p-4 text-slate-450">**Low**: Models default to parametric guesses when unsure.</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-slate-200">Execution Computes Cost</td>
                      <td className="p-4">**Lower**: Fits standard token execution rates.</td>
                      <td className="p-4 text-slate-450">**Higher**: Demands dedicated GPU nodes for training runs.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* RAG vs Fine-tuning summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-6 rounded-2xl border border-slate-850 text-xs">
                <div className="space-y-2">
                  <h4 className="font-bold text-azure-400 uppercase">When to select RAG:</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Select RAG when you have dynamic documents that update frequently (e.g. customer manuals, knowledge wikis, dynamic indexes) and you require high factual precision with auditable document citations.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-teal-400 uppercase">When to select Fine-Tuning:</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Select Fine-Tuning when you need the model to learn specific formatting rules, unique domain dialects, or custom writing styles, and have a static knowledge footprint.
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Real-World Use Cases */}
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-100">Enterprise RAG Implementations</h3>
                <p className="text-slate-400 text-xs">Common real-world deployment scenarios across organizations.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {useCases.map((uc, idx) => (
                  <div key={idx} className="glass-panel p-5 rounded-2xl flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="w-1.5 h-6 bg-azure-500 rounded-full" />
                      <h4 className="text-sm font-bold text-slate-100">{uc.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{uc.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Tab-driven Content Renderer */}
        {activeTab === 'architecture' && <Architecture />}
        {activeTab === 'ingestion' && <Implementation />}
        {activeTab === 'playground' && <Playground />}
        {activeTab === 'debugger' && <Debugger />}
        {activeTab === 'security' && <Security />}
      </main>

      {/* Professional Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 md:px-8 mt-16 text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-azure-500" />
            <span className="text-xs font-bold text-slate-300 font-mono">Azure AI + RAG Architecture Portfolio</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">
              GitHub
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">
              LinkedIn
            </a>
            <a href="mailto:engineer@example.com" className="hover:text-slate-300 transition-colors flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              Contact
            </a>
          </div>

          <p className="text-[10px] font-mono">
            &copy; {new Date().getFullYear()} Likhith. Built step-by-step with React & FastAPI.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
