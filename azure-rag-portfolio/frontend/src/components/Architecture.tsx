import React, { useState } from 'react';
import { ArrowRight, ArrowDown, HelpCircle, Layers, Database, Info } from 'lucide-react';

interface ArchitectureNode {
  id: string;
  name: string;
  purpose: string;
  input: string;
  output: string;
  tech: string;
  why: string;
  problem: string;
  solution: string;
}

export const Architecture: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string>('ai_search');

  const nodes: Record<string, ArchitectureNode> = {
    user: {
      id: 'user',
      name: 'User Input Query',
      purpose: 'The starting point of the RAG pipeline where the user enters natural language questions.',
      input: 'Natural language typed query (e.g. "What is our company holiday policy?").',
      output: 'Raw text string.',
      tech: 'Browser / Voice Input Client.',
      why: 'Serves as the search query and the target prompt context to ground.',
      problem: 'Unclear, ambiguous, or prompt injection queries attempting to bypass security boundaries.',
      solution: 'Apply query normalization, input validation, length limits, and content safety filters.'
    },
    frontend: {
      id: 'frontend',
      name: 'Frontend Application (React)',
      purpose: 'Exhibits a clean UI, controls query states, handles error popups, and formats responses.',
      input: 'User input fields, action buttons.',
      output: 'Structured API payload (JSON post body).',
      tech: 'React, TypeScript, Tailwind CSS.',
      why: 'Guarantees portfolio-quality user experience and shields client states.',
      problem: 'Exposing Azure keys, missing loading indicators, or poor responsive formatting on mobile.',
      solution: 'Ensure API keys are stored strictly in backend server environment variables (.env). Use spinners and skeleton loaders.'
    },
    backend: {
      id: 'backend',
      name: 'FastAPI Backend Routing',
      purpose: 'Secures REST endpoints, manages payload validation, handles CORS, and implements telemetry logs.',
      input: 'JSON POST payload containing query string.',
      output: 'Validated arguments sent to query pipeline services.',
      tech: 'FastAPI, Uvicorn, Pydantic.',
      why: 'Implements rate limits, authenticates client tokens, and logs system latency metrics.',
      problem: 'Slow query validation, missing network retry logics, or leak of internal stack traces in errors.',
      solution: 'Use Pydantic models for validation, custom global exception handlers, and async networking.'
    },
    embeddings: {
      id: 'embeddings',
      name: 'Embedding Generator (OpenAI)',
      purpose: 'Converts text inputs into 1536-dimensional coordinate arrays (vectors) representing semantic meaning.',
      input: 'Clean user query text.',
      output: '1536-dimensional floating point array (vector).',
      tech: 'Azure OpenAI (text-embedding-ada-002 / text-embedding-3-small).',
      why: 'Computers cannot calculate semantic similarity between letters; text must be mathematically represented.',
      problem: 'High network API latency, token limits, or vector dimension mismatches at the database level.',
      solution: 'Deploy Azure OpenAI in close regions to search index, implement token batching, and match index configuration dimensions.'
    },
    ai_search: {
      id: 'ai_search',
      name: 'Azure AI Search (Vector Store)',
      purpose: 'Indexes chunk vectors and executes fast cosine similarity lookups against query embeddings.',
      input: '1536-dimension float vector representation of query.',
      output: 'List of Top-K document chunks exceeding similarity thresholds.',
      tech: 'Azure AI Search Index (Hybrid + Semantic Ranker).',
      why: 'Retrieves relevant private document chunks without model training.',
      problem: 'Low retrieval quality, missing keywords matching, or vector index drift over time.',
      solution: 'Enable hybrid search (Vector + BM25), apply Reciprocal Rank Fusion (RRF), and activate Semantic Reranking.'
    },
    retriever: {
      id: 'retriever',
      name: 'Context Filter / Retriever',
      purpose: 'Parses retrieved chunks, filters by metadata parameters, and formats citations.',
      input: 'Raw document search hits.',
      output: 'Structured context string + source metadata array.',
      tech: 'Python data parsers, citation mapping.',
      why: 'Ensures the language model receives clean, formatted facts labeled with document sources.',
      problem: 'Duplicate text chunks wasting token limits, or including chunks below relevance threshold.',
      solution: 'Perform de-duplication, filter out chunks below similarity thresholds (e.g. < 0.75), and use metadata filters.'
    },
    prompt_builder: {
      id: 'prompt_builder',
      name: 'Prompt Construction Layer',
      purpose: 'Merges system constraints, user questions, and retrieved database context into a unified prompt.',
      input: 'Question + Context + System Instructions.',
      output: 'Augmented System Prompt payload.',
      tech: 'Prompt Engineering templates.',
      why: 'Forces the LLM to write answers restricted *only* to the retrieved context (grounding).',
      problem: 'Context window overflow, or the LLM ignoring instructions due to weak prompt formatting.',
      solution: 'Use XML tags to demarcate context sections, specify strict constraints ("If not found, reply \'I don\'t know\'"), and compress context.'
    },
    openai_llm: {
      id: 'openai_llm',
      name: 'Azure OpenAI GPT model',
      purpose: 'Generates cohesive natural language answers grounded in the prompt context facts.',
      input: 'Augmented System Prompt payload.',
      output: 'Grounded completion response text.',
      tech: 'Azure OpenAI (gpt-4o / gpt-4-turbo).',
      why: 'Synthesizes context document snippets into a fluent, readable summary.',
      problem: 'Hallucinating ungrounded facts, rate limit throttling, or slow response generation times.',
      solution: 'Set model temperature to 0.0, require citation codes (e.g. [doc1]), and configure response streaming.'
    },
    response: {
      id: 'response',
      name: 'Grounded Answer UI',
      purpose: 'Renders the final completion text to the user, highlighting citation links to source files.',
      input: 'Grounded response string + sources.',
      output: 'Interactive UI layout.',
      tech: 'React Components, CSS highlight states.',
      why: 'Builds user trust by showing exactly where the answers came from.',
      problem: 'Vague citation pointers, formatting breaks, or broken file download download paths.',
      solution: 'Highlight citations in text (e.g., clicking [doc-01] opens source viewer), and parse markdown structures.'
    }
  };

  const ingestionPipeline = [
    { id: 'ingest_docs', name: 'Raw Documents', desc: 'PDF, TXT, DOCX files stored in Azure Blob Storage.' },
    { id: 'ingest_loader', name: 'Document Loader', desc: 'Azure Document Intelligence extracts raw text, layout tables, and metadata.' },
    { id: 'ingest_chunk', name: 'Sliding Window Chunking', desc: 'Splits raw text into 512-character segments with 10% overlap.' },
    { id: 'ingest_embed', name: 'Embedding Ada-002', desc: 'Generates 1536 float arrays for each text segment.' },
    { id: 'ingest_index', name: 'Vector Store Index', desc: 'Pushes chunk vectors and text mapping to Azure AI Search database index.' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Introduction */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-azure-400 to-teal-400 bg-clip-text text-transparent">
          Interactive Azure RAG Architecture
        </h2>
        <p className="text-slate-400 text-sm">
          Click on any component in the diagrams below to inspect its inputs, outputs, technologies, common runtime issues, and production-grade solutions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Diagrams Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Query Pipeline Diagram */}
          <div className="glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 bg-azure-500/10 text-azure-400 text-xs font-semibold rounded-bl-xl border-l border-b border-slate-800/80">
              Query Pipeline Flow
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
              <Layers className="w-5 h-5 text-azure-400" />
              Runtime User Request Flow
            </h3>

            <div className="flex flex-col gap-4">
              {/* Row 1: Frontend & Input */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedNode('user')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedNode === 'user'
                      ? 'bg-azure-500/20 border-azure-400 shadow-lg shadow-azure-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-500">Step 1</div>
                  <div className="text-xs font-bold text-slate-100 mt-1">User Query</div>
                </button>

                <div className="flex items-center justify-center text-slate-600">
                  <ArrowRight className="w-5 h-5 animate-pulse text-azure-500" />
                </div>

                <button
                  onClick={() => setSelectedNode('frontend')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedNode === 'frontend'
                      ? 'bg-azure-500/20 border-azure-400 shadow-lg shadow-azure-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-500">Step 2</div>
                  <div className="text-xs font-bold text-slate-100 mt-1">React App UI</div>
                </button>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-end pr-14 text-slate-600">
                <ArrowDown className="w-5 h-5 text-azure-500 animate-pulse" />
              </div>

              {/* Row 2: Backend and Embeddings */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedNode('embeddings')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedNode === 'embeddings'
                      ? 'bg-azure-500/20 border-azure-400 shadow-lg shadow-azure-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-500">Step 4</div>
                  <div className="text-xs font-bold text-slate-100 mt-1">Embedding (OpenAI)</div>
                </button>

                <div className="flex items-center justify-center text-slate-600">
                  <ArrowRight className="w-5 h-5 text-azure-500" />
                </div>

                <button
                  onClick={() => setSelectedNode('backend')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedNode === 'backend'
                      ? 'bg-azure-500/20 border-azure-400 shadow-lg shadow-azure-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-500">Step 3</div>
                  <div className="text-xs font-bold text-slate-100 mt-1">FastAPI Backend</div>
                </button>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-start pl-14 text-slate-600">
                <ArrowDown className="w-5 h-5 text-azure-500 animate-pulse" />
              </div>

              {/* Row 3: Vector Db and Retrieval Filter */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedNode('ai_search')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedNode === 'ai_search'
                      ? 'bg-azure-500/20 border-azure-400 shadow-lg shadow-azure-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-500">Step 5</div>
                  <div className="text-xs font-bold text-slate-100 mt-1">Azure AI Search</div>
                </button>

                <div className="flex items-center justify-center text-slate-600">
                  <ArrowRight className="w-5 h-5 text-azure-500" />
                </div>

                <button
                  onClick={() => setSelectedNode('retriever')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedNode === 'retriever'
                      ? 'bg-azure-500/20 border-azure-400 shadow-lg shadow-azure-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-500">Step 6</div>
                  <div className="text-xs font-bold text-slate-100 mt-1">Context Retriever</div>
                </button>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-end pr-14 text-slate-600">
                <ArrowDown className="w-5 h-5 text-azure-500 animate-pulse" />
              </div>

              {/* Row 4: Prompt Construction & LLM */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedNode('openai_llm')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedNode === 'openai_llm'
                      ? 'bg-azure-500/20 border-azure-400 shadow-lg shadow-azure-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-500">Step 8</div>
                  <div className="text-xs font-bold text-slate-100 mt-1">Azure OpenAI GPT</div>
                </button>

                <div className="flex items-center justify-center text-slate-600">
                  <ArrowRight className="w-5 h-5 text-azure-500" />
                </div>

                <button
                  onClick={() => setSelectedNode('prompt_builder')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedNode === 'prompt_builder'
                      ? 'bg-azure-500/20 border-azure-400 shadow-lg shadow-azure-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-500">Step 7</div>
                  <div className="text-xs font-bold text-slate-100 mt-1">Prompt Construction</div>
                </button>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-start pl-14 text-slate-600">
                <ArrowDown className="w-5 h-5 text-azure-500 animate-pulse" />
              </div>

              {/* Row 5: Final Response */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedNode('response')}
                  className={`col-span-3 p-4 rounded-xl border text-center transition-all ${
                    selectedNode === 'response'
                      ? 'bg-azure-500/20 border-azure-400 shadow-lg shadow-azure-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-500">Step 9</div>
                  <div className="text-xs font-bold text-slate-100 mt-1">Grounded Response Output</div>
                </button>
              </div>
            </div>
          </div>

          {/* Ingestion Pipeline Diagram */}
          <div className="glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 bg-teal-500/10 text-teal-400 text-xs font-semibold rounded-bl-xl border-l border-b border-slate-800/80">
              Ingestion Pipeline Flow
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
              <Database className="w-5 h-5 text-teal-400" />
              Document Ingestion & Indexing Pipeline
            </h3>

            <div className="flex flex-col md:flex-row items-center justify-between gap-2">
              {ingestionPipeline.map((step, idx) => (
                <React.Fragment key={step.id}>
                  <div className="flex-1 w-full bg-slate-950/60 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="text-[10px] font-bold text-teal-500 uppercase">Phase {idx + 1}</div>
                    <div className="text-xs font-bold text-slate-100 mt-1">{step.name}</div>
                    <p className="text-[10px] text-slate-400 mt-2 leading-snug">{step.desc}</p>
                  </div>
                  {idx < ingestionPipeline.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-slate-600 hidden md:block" />
                  )}
                  {idx < ingestionPipeline.length - 1 && (
                    <ArrowDown className="w-4 h-4 text-slate-600 block md:hidden my-1" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

        </div>

        {/* Detailed Drawer Column */}
        <div className="glass-panel rounded-2xl p-6 shadow-xl h-fit border-l-4 border-l-azure-500">
          <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Info className="w-5 h-5 text-azure-400" />
            Component Inspector
          </h3>

          {selectedNode ? (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Name</h4>
                <p className="text-lg font-bold text-slate-100 mt-0.5">{nodes[selectedNode].name}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Purpose</h4>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">{nodes[selectedNode].purpose}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase">Input</h4>
                  <p className="text-xs text-slate-300 mt-1 bg-slate-950 p-2 rounded-lg border border-slate-800">{nodes[selectedNode].input}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase">Output</h4>
                  <p className="text-xs text-slate-300 mt-1 bg-slate-950 p-2 rounded-lg border border-slate-800">{nodes[selectedNode].output}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase">Technology Stack</h4>
                <p className="text-xs text-azure-400 font-mono mt-1 bg-azure-500/5 px-3 py-1.5 rounded-lg border border-azure-500/20">{nodes[selectedNode].tech}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase">Why it is required</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{nodes[selectedNode].why}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="bg-rose-500/5 p-3 rounded-lg border border-rose-500/20">
                  <h5 className="text-xs font-bold text-rose-400 flex items-center gap-1">⚠️ Common Production Issue</h5>
                  <p className="text-xs text-slate-300 mt-1">{nodes[selectedNode].problem}</p>
                </div>

                <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20">
                  <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-1">🛡️ Engineering Mitigation</h5>
                  <p className="text-xs text-slate-300 mt-1">{nodes[selectedNode].solution}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <HelpCircle className="w-10 h-10 mb-2 stroke-1" />
              <p className="text-xs">Click a box in the query flowchart to inspect.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
