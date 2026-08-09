import React, { useState } from 'react';
import { Layers, Scissors, Hash, Sliders } from 'lucide-react';

export const Implementation: React.FC = () => {
  const [sampleText, setSampleText] = useState<string>(
    "Retrieval-Augmented Generation (RAG) is a technique that enhances large language models by retrieving facts from external databases. First, documents are loaded and parsed. Then, they are chunked into smaller text blocks. Next, embedding models convert text blocks into vector representations. These vectors are indexed in a vector store. When a user asks a question, the vector database finds the closest semantic matches, constructs an augmented prompt, and GPT generates an answer based strictly on retrieved facts."
  );
  
  const [chunkSize, setChunkSize] = useState<number>(100);
  const [overlap, setOverlap] = useState<number>(20);

  // Helper logic to simulate overlapping chunks
  const calculateChunks = (text: string, size: number, over: number) => {
    const chunksList = [];
    if (!text || size <= 0) return [];
    
    let index = 0;
    while (index < text.length) {
      const chunkStr = text.substring(index, index + size);
      chunksList.push({
        id: chunksList.length + 1,
        text: chunkStr,
        start: index,
        end: index + chunkStr.length
      });
      
      if (index + size >= text.length) break;
      index += (size - over); // Step forward by size minus overlap
    }
    return chunksList;
  };

  const chunks = calculateChunks(sampleText, chunkSize, overlap);

  const steps = [
    {
      title: "Phase 1: Ingestion & Upload",
      desc: "Documents are uploaded to Azure Blob Storage (PDF, TXT, DOCX) and parsed using Azure Document Intelligence to retrieve layouts, structures, and metadata columns."
    },
    {
      title: "Phase 2: Text Extraction & Parsing",
      desc: "Raw document bytes are parsed into clean text. Tables, headers, and structural lines are converted into semantic markdown layouts to retain context."
    },
    {
      title: "Phase 3: Sliding-Window Chunking",
      desc: "Documents are split into uniform text segments. Sliding windows are used to keep a percentage of text (e.g. 10% overlap) across boundaries to prevent broken contextual meanings."
    },
    {
      title: "Phase 4: OpenAI Embeddings",
      desc: "Text chunks are forwarded to the Azure OpenAI text-embedding-ada-002 model, returning a 1536-dimensional coordinate vector representing its semantic placement."
    },
    {
      title: "Phase 5: Vector Indexing",
      desc: "The vector representation, along with raw text and metadata fields (source, author, page), is pushed to the Azure AI Search index database."
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-azure-400 to-teal-400 bg-clip-text text-transparent">
          RAG Ingestion Pipeline & Chunking
        </h2>
        <p className="text-slate-400 text-sm">
          Learn how document files are converted from raw text to vectorized indexing databases, and interact with the sliding window chunking simulator.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pipeline Info Panels */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 px-1">
            <Layers className="w-5 h-5 text-azure-400" />
            Ingestion Pipeline Stages
          </h3>

          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={idx} className="glass-panel p-4 rounded-xl space-y-2 border-l-4 border-l-teal-500">
                <div className="text-xs font-bold text-teal-400 uppercase tracking-wider">{step.title}</div>
                <p className="text-xs text-slate-300 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chunking Sandbox */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Scissors className="w-5 h-5 text-azure-400 animate-bounce" />
              Interactive Chunking Visualizer
            </h3>

            {/* Sandbox Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Input Document Text</label>
                <textarea
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  className="w-full h-28 bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-azure-500 font-sans resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-950/45 rounded-xl border border-slate-800/80">
                {/* Chunk Size Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-400 uppercase flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5" />
                      Chunk Size
                    </span>
                    <span className="text-azure-400 font-bold font-mono">{chunkSize} chars</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="300"
                    step="10"
                    value={chunkSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setChunkSize(val);
                      if (overlap >= val) setOverlap(val - 10);
                    }}
                    className="w-full accent-azure-500"
                  />
                </div>

                {/* Overlap Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-400 uppercase flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5" />
                      Overlap Size
                    </span>
                    <span className="text-teal-400 font-bold font-mono">{overlap} chars</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, chunkSize - 10)}
                    step="5"
                    value={overlap}
                    onChange={(e) => setOverlap(parseInt(e.target.value))}
                    className="w-full accent-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase">
                <span>Segment Output</span>
                <span className="text-slate-400 font-mono">Total Chunks: <strong className="text-azure-400">{chunks.length}</strong></span>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {chunks.map((chunk) => (
                  <div key={chunk.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-azure-400 uppercase tracking-wider">Chunk #{chunk.id}</span>
                      <span className="text-[9px] text-slate-500 font-mono">Chars: {chunk.text.length} | Range: {chunk.start}-{chunk.end}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2 font-mono leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-900">
                      {chunk.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
