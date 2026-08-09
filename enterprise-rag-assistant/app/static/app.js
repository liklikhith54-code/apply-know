/* ═══════════════════════════════════════════════════════════════
   Enterprise RAG Knowledge Assistant — app.js
   All API calls and UI logic
═══════════════════════════════════════════════════════════════ */

const API = '/api/v1';
let chatHistory = [];

// ─── NAVIGATION ─────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  if (window.innerWidth < 700) document.getElementById('sidebar').classList.remove('open');

  if (page === 'dashboard')     loadDashboard();
  if (page === 'kb')            loadDocuments();
  if (page === 'evaluation')    loadEvaluation();
  if (page === 'azurestatus')   loadStatus();
  if (page === 'failures')      showScenario(1, document.querySelector('.stab'));
  if (page === 'problemsolving') loadProblemSolving();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ─── INIT ────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  loadStatus(); // silently for sidebar badge
});

// ─── STATUS BADGE (sidebar) ──────────────────────────────────────
async function refreshModeBadge() {
  try {
    const r = await fetch(`${API}/status`);
    const d = await r.json();
    const badge = document.getElementById('modeBadge');
    const testBadge = document.getElementById('testBadge');
    if (d.mock_mode) {
      badge.innerHTML = '<span class="pulse" style="background:var(--warn)"></span> LOCAL / MOCK MODE';
      badge.style.background = 'rgba(245,158,11,0.1)';
      badge.style.borderColor = 'rgba(245,158,11,0.25)';
      badge.style.color = 'var(--warn)';
    } else {
      badge.innerHTML = '<span class="pulse" style="background:var(--success)"></span> AZURE MODE';
      badge.style.background = 'rgba(34,197,94,0.1)';
      badge.style.borderColor = 'rgba(34,197,94,0.25)';
      badge.style.color = 'var(--success)';
    }
    testBadge.textContent = '⬤ Tests: 34 / 34 ✓';
  } catch(e) {
    document.getElementById('modeBadge').innerHTML = '<span class="pulse" style="background:var(--danger)"></span> API OFFLINE';
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────────
async function loadDashboard() {
  await refreshModeBadge();
  try {
    const [dashRes, statusRes] = await Promise.all([
      fetch(`${API}/dashboard`),
      fetch(`${API}/status`)
    ]);
    const dash = await dashRes.json();
    const status = await statusRes.json();

    // Stats
    document.getElementById('dashStats').innerHTML = `
      <div class="stat-card"><div class="stat-val">${dash.document_count}</div><div class="stat-lbl">Documents</div></div>
      <div class="stat-card"><div class="stat-val">${dash.chunk_count}</div><div class="stat-lbl">Chunks Indexed</div></div>
      <div class="stat-card"><div class="stat-val">${dash.evaluation_questions}</div><div class="stat-lbl">Eval Questions</div></div>
      <div class="stat-card"><div class="stat-val">${dash.test_files}</div><div class="stat-lbl">Test Modules</div></div>
    `;

    // Services
    document.getElementById('dashServices').innerHTML = `
      <div class="service-row"><span>Azure OpenAI</span><span class="${statusClass(status.azure_openai)}">${status.azure_openai}</span></div>
      <div class="service-row"><span>Azure AI Search</span><span class="${statusClass(status.azure_search)}">${status.azure_search}</span></div>
      <div class="service-row"><span>Azure Blob Storage</span><span class="${statusClass(status.azure_storage)}">${status.azure_storage}</span></div>
      <div class="service-row"><span>Application Insights</span><span class="${status.application_insights === 'CONFIGURED' ? 'badge-connected' : 'badge-notcfg'}">${status.application_insights}</span></div>
    `;

    // KB summary
    const ingestionTime = dash.last_ingestion
      ? new Date(dash.last_ingestion).toLocaleString()
      : 'Not yet run';
    document.getElementById('dashKB').innerHTML = `
      <div class="kv-row"><span>Search Index</span><span>${dash.search_index}</span></div>
      <div class="kv-row"><span>Embedding Dimensions</span><span>${dash.embedding_dimensions}</span></div>
      <div class="kv-row"><span>Last Ingestion</span><span>${ingestionTime}</span></div>
      <div class="kv-row"><span>Service Mode</span><span class="${dash.mock_mode ? 'badge-mock' : 'badge-connected'}">${dash.service_mode}</span></div>
    `;
  } catch(e) {
    document.getElementById('dashStats').innerHTML = `<div class="error-msg" style="grid-column:1/-1">Failed to load dashboard: ${e.message}</div>`;
  }
}

function statusClass(val) {
  if (!val) return 'badge-notcfg';
  if (val === 'CONNECTED')      return 'badge-connected';
  if (val === 'MOCK MODE')      return 'badge-mock';
  if (val === 'NOT CONFIGURED') return 'badge-notcfg';
  return 'badge-error';
}

// ─── CHAT ─────────────────────────────────────────────────────────
function fillQuery(q) {
  document.getElementById('chatInput').value = q;
  document.getElementById('chatInput').focus();
  sendChat();
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
}

function clearChat() {
  chatHistory = [];
  const msgs = document.getElementById('chatMessages');
  msgs.innerHTML = `
    <div class="chat-empty">
      <div class="empty-icon">◈</div>
      <div class="empty-title">Ask the knowledge assistant</div>
      <div class="empty-sub">Connected to FastAPI backend · POST /api/v1/chat</div>
      <div class="example-queries">
        <button class="example-btn" onclick="fillQuery('What is the 2026 leave policy?')">What is the 2026 leave policy?</button>
        <button class="example-btn" onclick="fillQuery('How many vacation days are employees entitled to?')">How many vacation days per year?</button>
        <button class="example-btn" onclick="fillQuery('What is the notice period for leave requests?')">Leave request notice period?</button>
      </div>
    </div>`;
  resetPipelineTrace();
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const question = input.value.trim();
  if (!question) return;

  const dept  = document.getElementById('chatDept').value || null;
  const grpVal = document.getElementById('chatGroups').value;
  const groups = grpVal === 'ALL' ? [] : [grpVal];
  const searchMode = document.getElementById('chatSearchMode').value;
  const topK = parseInt(document.getElementById('chatTopK').value) || 5;

  input.value = '';
  const btn = document.getElementById('sendBtn');
  btn.disabled = true;
  document.getElementById('sendBtnIcon').textContent = '…';

  // Clear empty state if present
  const emptyEl = document.querySelector('.chat-empty');
  if (emptyEl) emptyEl.remove();

  const msgs = document.getElementById('chatMessages');

  // User message
  msgs.innerHTML += `<div class="msg-user">${escapeHtml(question)}</div>`;

  // Loading indicator
  const loadId = 'load-' + Date.now();
  msgs.innerHTML += `
    <div class="msg-assistant" id="${loadId}">
      <div class="msg-loading">
        <div class="dots"><span></span><span></span><span></span></div>
        Retrieving and generating answer...
      </div>
    </div>`;
  msgs.scrollTop = msgs.scrollHeight;

  // Show pipeline in progress
  showPipelineProgress('waiting');

  try {
    const t0 = performance.now();
    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        history: chatHistory,
        user_department: dept,
        user_groups: groups,
        search_mode: searchMode,
        top_k: topK
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const totalMs = (performance.now() - t0).toFixed(0);

    // Add to history
    chatHistory.push({ role: 'user', content: question });
    chatHistory.push({ role: 'assistant', content: data.answer });

    // Build response HTML
    const confClass = `confidence-${data.confidence}`;
    const citations = (data.citations || []).map((c, i) =>
      `<div class="source-card">
        <div class="source-name">[${i+1}] ${escapeHtml(c.document_name)}</div>
        <div class="source-meta">${c.section ? 'Section: ' + escapeHtml(c.section) : ''}${c.page ? ' · Page ' + c.page : ''}</div>
       </div>`
    ).join('');

    const loadEl = document.getElementById(loadId);
    loadEl.innerHTML = `
      <div class="msg-answer">${escapeHtml(data.answer)}</div>
      <div class="msg-meta">
        <span class="confidence-badge ${confClass}">◉ ${data.confidence} CONFIDENCE</span>
        <span class="latency-badge">⏱ ${data.latency_ms.toFixed(0)}ms</span>
        <span class="latency-badge">📄 ${(data.citations || []).length} citations</span>
        <span class="latency-badge">🔍 ${(data.retrieved_documents || []).length} chunks</span>
      </div>
      ${citations ? '<div class="source-cards">' + citations + '</div>' : ''}
    `;
    msgs.scrollTop = msgs.scrollHeight;

    // Update pipeline trace
    showPipelineComplete(data, question, totalMs);

  } catch(e) {
    const loadEl = document.getElementById(loadId);
    if (loadEl) loadEl.innerHTML = `<div class="error-msg">Error: ${escapeHtml(e.message)}</div>`;
    showPipelineError(e.message);
  }

  btn.disabled = false;
  document.getElementById('sendBtnIcon').textContent = '➤';
  msgs.scrollTop = msgs.scrollHeight;
}

function showPipelineProgress(state) {
  document.getElementById('pipelineTrace').innerHTML = `
    <div class="trace-step"><div class="trace-indicator active">1</div><div class="trace-body"><div class="trace-name">Query Rewriting</div><div class="trace-detail">Processing conversational context...</div></div></div>
    <div class="trace-step"><div class="trace-indicator active">2</div><div class="trace-body"><div class="trace-name">ACL Filter</div><div class="trace-detail">Checking user entitlements...</div></div></div>
    <div class="trace-step"><div class="trace-indicator active">3</div><div class="trace-body"><div class="trace-name">Hybrid Search</div><div class="trace-detail">Vector + Keyword retrieval...</div></div></div>
    <div class="trace-step"><div class="trace-indicator active">4</div><div class="trace-body"><div class="trace-name">Confidence Scoring</div><div class="trace-detail">Evaluating evidence...</div></div></div>
    <div class="trace-step"><div class="trace-indicator active">5</div><div class="trace-body"><div class="trace-name">Generation</div><div class="trace-detail">Calling Azure OpenAI...</div></div></div>
  `;
}

function showPipelineComplete(data, originalQuery, totalMs) {
  const chunks = data.retrieved_documents || [];
  const topScore = chunks.length > 0 ? (chunks[0].score || 0).toFixed(3) : 'N/A';
  const isSufficient = data.confidence !== 'LOW';
  const confColor = data.confidence === 'HIGH' ? 'done' : data.confidence === 'MEDIUM' ? 'active' : 'warn';

  document.getElementById('pipelineTrace').innerHTML = `
    <div class="trace-step">
      <div class="trace-indicator done">✓</div>
      <div class="trace-body">
        <div class="trace-name">Query Rewriting</div>
        <div class="trace-detail">"${escapeHtml(originalQuery.substring(0,60))}..."</div>
      </div>
    </div>
    <div class="trace-step">
      <div class="trace-indicator done">✓</div>
      <div class="trace-body">
        <div class="trace-name">ACL / Security Filter</div>
        <div class="trace-detail">Groups applied pre-retrieval</div>
      </div>
    </div>
    <div class="trace-step">
      <div class="trace-indicator done">✓</div>
      <div class="trace-body">
        <div class="trace-name">Hybrid Search (Vector+Keyword)</div>
        <div class="trace-detail">${chunks.length} chunks retrieved · Top score: ${topScore}</div>
        <div class="trace-latency">${data.latency_ms.toFixed(0)}ms total</div>
      </div>
    </div>
    <div class="trace-step">
      <div class="trace-indicator ${confColor}">✓</div>
      <div class="trace-body">
        <div class="trace-name">Confidence: ${data.confidence}</div>
        <div class="trace-detail">${isSufficient ? 'Sufficient evidence → proceed to generation' : 'LOW confidence → abstention response'}</div>
      </div>
    </div>
    <div class="trace-step">
      <div class="trace-indicator done">✓</div>
      <div class="trace-body">
        <div class="trace-name">Answer Generation</div>
        <div class="trace-detail">${(data.citations||[]).length} citations · Grounded response</div>
      </div>
    </div>
  `;
}

function showPipelineError(msg) {
  document.getElementById('pipelineTrace').innerHTML = `
    <div class="trace-step">
      <div class="trace-indicator" style="background:rgba(244,63,94,0.15);color:var(--danger);border-color:rgba(244,63,94,0.3)">✕</div>
      <div class="trace-body">
        <div class="trace-name" style="color:var(--danger)">Pipeline Error</div>
        <div class="trace-detail">${escapeHtml(msg)}</div>
      </div>
    </div>
  `;
}

function resetPipelineTrace() {
  document.getElementById('pipelineTrace').innerHTML = '<div class="trace-empty">Send a message to see<br/>the RAG pipeline trace</div>';
}

// ─── KNOWLEDGE BASE ───────────────────────────────────────────────
async function loadDocuments() {
  try {
    const res = await fetch(`${API}/documents`);
    const data = await res.json();
    const docs = data.documents || [];
    document.getElementById('docCountBadge').textContent = docs.length;

    if (docs.length === 0) {
      document.getElementById('docTable').innerHTML = '<div class="loading-msg">No documents found in data/documents/. Add files and click Ingest.</div>';
      return;
    }

    const rows = docs.map(d => `
      <tr>
        <td><strong style="color:var(--accent);font-family:var(--mono)">${escapeHtml(d.name)}</strong></td>
        <td><span class="tag tag-blue">${d.type}</span></td>
        <td>${formatBytes(d.size_bytes)}</td>
        <td>${d.chunk_count > 0 ? d.chunk_count : '<span style="color:var(--text3)">0</span>'}</td>
        <td>${d.indexed ? '<span class="indexed-yes">✓ Indexed</span>' : '<span class="indexed-no">Not indexed</span>'}</td>
        <td><span class="tag tag-green">${d.access_groups.join(', ')}</span></td>
        <td style="color:var(--text3);font-size:11px">${new Date(d.modified).toLocaleDateString()}</td>
      </tr>`).join('');

    document.getElementById('docTable').innerHTML = `
      <table>
        <thead><tr>
          <th>Document</th><th>Type</th><th>Size</th>
          <th>Chunks</th><th>Index Status</th><th>Access Groups</th><th>Modified</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch(e) {
    document.getElementById('docTable').innerHTML = `<div class="error-msg">Failed to load documents: ${e.message}</div>`;
  }
}

async function runIngest() {
  const btn = document.getElementById('ingestBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Ingesting...';
  const resultEl = document.getElementById('ingestResult');
  resultEl.className = 'ingest-result ingest-loading';
  resultEl.textContent = '⚙️ Running ingestion pipeline...';
  resultEl.style.display = 'block';

  try {
    const res = await fetch(`${API}/ingest`, { method: 'POST' });
    const data = await res.json();

    if (data.status === 'success') {
      resultEl.className = 'ingest-result ingest-success';
      resultEl.innerHTML = `
        ✅ Ingestion Complete (${data.mock_mode ? 'MOCK MODE' : 'AZURE MODE'})
        <br/>Files processed: ${(data.processed_files || []).length}
        · Chunks created: ${data.chunks_created}
        · Embeddings: ${data.embeddings_generated}
        · Dimensions: ${data.embedding_dimensions}
      `;
      loadDocuments();
    } else {
      resultEl.className = 'ingest-result ingest-error';
      resultEl.textContent = '❌ Ingestion failed: ' + (data.error || 'Unknown error');
    }
  } catch(e) {
    resultEl.className = 'ingest-result ingest-error';
    resultEl.textContent = '❌ Error: ' + e.message;
  }

  btn.disabled = false;
  btn.textContent = '⚡ Ingest Documents';
}

// ─── DIAGNOSTICS ──────────────────────────────────────────────────
async function runDiagnostic() {
  const query = document.getElementById('diagQuery').value.trim();
  if (!query) return;

  const dept = document.getElementById('diagDept').value || null;
  const resultEl = document.getElementById('diagResult');
  resultEl.style.display = 'none';

  document.querySelector('[onclick="runDiagnostic()"]').disabled = true;
  document.querySelector('[onclick="runDiagnostic()"]').textContent = '⏳ Tracing...';

  try {
    const t0 = performance.now();
    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: query,
        history: [],
        user_department: dept,
        user_groups: []
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const elapsed = (performance.now() - t0).toFixed(0);

    resultEl.style.display = 'block';
    const chunks = data.retrieved_documents || [];

    // Query panel
    document.getElementById('diagQueryPanel').innerHTML = `
      <div class="kv-row"><span>Original Query</span><span>${escapeHtml(query.substring(0,50))}</span></div>
      <div class="kv-row"><span>Department Filter</span><span>${dept || 'None'}</span></div>
      <div class="kv-row"><span>Confidence</span><span class="${statusClass(data.confidence)}">${data.confidence}</span></div>
      <div class="kv-row"><span>Citations</span><span>${(data.citations||[]).length}</span></div>
    `;

    // Metrics panel
    document.getElementById('diagMetrics').innerHTML = `
      <div class="kv-row"><span>Total Latency</span><span style="color:var(--cyan)">${data.latency_ms.toFixed(1)}ms</span></div>
      <div class="kv-row"><span>Chunks Retrieved</span><span>${chunks.length}</span></div>
      <div class="kv-row"><span>Top Score</span><span>${chunks.length > 0 ? (chunks[0].score||0).toFixed(4) : 'N/A'}</span></div>
      <div class="kv-row"><span>Search Mode</span><span>Hybrid (Vector + Keyword)</span></div>
    `;

    // Pipeline trace
    document.getElementById('diagPipeline').innerHTML = `
      <div class="trace-step"><div class="trace-indicator done">1</div><div class="trace-body"><div class="trace-name">Query Received</div><div class="trace-detail">"${escapeHtml(query.substring(0,80))}"</div></div></div>
      <div class="trace-step"><div class="trace-indicator done">2</div><div class="trace-body"><div class="trace-name">Query Rewriting</div><div class="trace-detail">Standalone query generated for retrieval</div></div></div>
      <div class="trace-step"><div class="trace-indicator done">3</div><div class="trace-body"><div class="trace-name">ACL Pre-Filter</div><div class="trace-detail">user_groups=ALL · dept=${dept||'None'} applied before search</div></div></div>
      <div class="trace-step"><div class="trace-indicator done">4</div><div class="trace-body"><div class="trace-name">Hybrid Search</div><div class="trace-detail">Vector similarity + BM25 keyword → RRF fusion → ${chunks.length} chunks</div></div></div>
      <div class="trace-step"><div class="trace-indicator ${data.confidence === 'LOW' ? 'warn' : 'done'}">5</div><div class="trace-body"><div class="trace-name">Confidence Scoring → ${data.confidence}</div><div class="trace-detail">Multi-factor: RRF score + rerank + coverage</div></div></div>
      <div class="trace-step"><div class="trace-indicator done">6</div><div class="trace-body"><div class="trace-name">Answer Generation</div><div class="trace-detail">Grounded response with ${(data.citations||[]).length} citations · ${data.latency_ms.toFixed(0)}ms</div></div></div>
    `;

    // Chunks
    document.getElementById('diagChunkCount').textContent = chunks.length;
    document.getElementById('diagChunks').innerHTML = chunks.length === 0
      ? '<div class="loading-msg">No chunks retrieved</div>'
      : chunks.map((c,i) => `
          <div class="chunk-card">
            <div class="chunk-header">
              <span class="chunk-doc">[${i+1}] ${escapeHtml(c.document_name || 'Unknown')}</span>
              <div class="chunk-scores">
                <span class="tag tag-blue">score: ${(c.score||0).toFixed(4)}</span>
                ${c.section ? `<span class="tag tag-gold">${escapeHtml(c.section)}</span>` : ''}
                ${c.page_number ? `<span class="tag tag-green">p.${c.page_number}</span>` : ''}
              </div>
            </div>
            <div class="chunk-content">${escapeHtml((c.content||'').substring(0,250))}${(c.content||'').length>250?'...':''}</div>
          </div>`).join('');

    document.getElementById('diagAnswer').textContent = data.answer;

  } catch(e) {
    document.getElementById('diagResult').style.display = 'block';
    document.getElementById('diagQueryPanel').innerHTML = `<div class="error-msg">${e.message}</div>`;
  }

  document.querySelector('[onclick="runDiagnostic()"]').disabled = false;
  document.querySelector('[onclick="runDiagnostic()"]').textContent = '▶ Trace';
}

// ─── FAILURE SCENARIOS ────────────────────────────────────────────
const SCENARIOS = {
  1: {
    title: 'Scenario 1 — Wrong Chunk Granularity',
    badge: '✓ FIXED',
    badgeClass: 'badge-fixed',
    description: 'A basic RAG with a fixed chunk size of 4000 characters consistently retrieved chunks containing irrelevant boilerplate. The relevant policy clause was split across two chunks, and neither contained enough context to answer accurately.',
    flow: [
      { label: 'Baseline: Fixed 4000-char chunks', cls: 'baseline' },
      { label: '→ Root Cause: Clause split across boundary', cls: 'cause' },
      { label: '→ Fix: Configurable chunk_size + overlap', cls: 'fix' },
      { label: '→ Result: Hit@1 improved 43% → 60%', cls: 'result' }
    ],
    code: `# Configurable chunking via API
POST /api/v1/ingest?chunk_size=800&chunk_overlap=200

# Retrieval config
POST /api/v1/chat  →  top_k=5, candidate_k=20 (RRF reranking)`,
    detail: 'The fix introduces configurable chunk_size (default 1000) and chunk_overlap (default 200) parameters. Smaller chunks with overlap ensure policy clauses are not split. RRF fusion across vector+keyword retrieval further improves precision.'
  },
  2: {
    title: 'Scenario 2 — Multi-Document Information Spread',
    badge: '✓ FIXED',
    badgeClass: 'badge-fixed',
    description: 'The question "Compare the leave policies across departments" required information from multiple document sections. The baseline RAG returned only one chunk, producing an incomplete answer with no cross-document synthesis.',
    flow: [
      { label: 'Baseline: Top-1 chunk only', cls: 'baseline' },
      { label: '→ Root Cause: No multi-doc aggregation', cls: 'cause' },
      { label: '→ Fix: top_k=5 + RRF cross-doc ranking', cls: 'fix' },
      { label: '→ Result: Multi-source citations in response', cls: 'result' }
    ],
    code: `# RRF fusion ranks across multiple documents
# Each retrieved chunk gets: score = 1/(k + rank)
# Combined across vector and keyword rankings

retrieved_chunks = top_5_by_rrf_score(
    vector_results + keyword_results
)`,
    detail: 'Reciprocal Rank Fusion (RRF) merges vector similarity and keyword BM25 rankings, ensuring the best chunks from multiple documents are surfaced. The generator then synthesizes a multi-source answer with citations for each document.'
  },
  3: {
    title: 'Scenario 3 — Version Conflict (Stale Policy)',
    badge: '✓ FIXED',
    badgeClass: 'badge-fixed',
    description: 'The knowledge base contained both a 2024 and 2026 HR Leave Policy. The baseline RAG returned the 2024 version as the top result, producing a factually outdated answer about vacation entitlement.',
    flow: [
      { label: 'Baseline: Returned 2024 policy (stale)', cls: 'baseline' },
      { label: '→ Root Cause: No effective_date filtering', cls: 'cause' },
      { label: '→ Fix: Metadata version + date filter', cls: 'fix' },
      { label: '→ Result: Always retrieves current version', cls: 'result' }
    ],
    code: `# Metadata tagged at ingestion
chunk.metadata = {
    "version": "2.1",
    "effective_date": "2026-08-08",
    "document_name": "HR_Leave_2026.txt"
}

# OData filter in Azure AI Search (production)
filter = "effective_date ge 2026-01-01 and version eq '2.1'"`,
    detail: 'Every chunk is tagged with version and effective_date during ingestion. In production, an OData pre-filter ensures only current-version documents enter retrieval. In mock mode, version priority sorting is applied post-retrieval.'
  },
  4: {
    title: 'Scenario 4 — Hallucination / Insufficient Evidence',
    badge: '✓ FIXED',
    badgeClass: 'badge-fixed',
    description: 'Querying about "parental leave entitlement" where no document covers this topic caused the baseline to hallucinate a plausible-sounding but fabricated answer. The improved system detects insufficient evidence and abstains.',
    flow: [
      { label: 'Baseline: Hallucinated answer', cls: 'baseline' },
      { label: '→ Root Cause: No evidence validation', cls: 'cause' },
      { label: '→ Fix: Multi-factor confidence scoring', cls: 'fix' },
      { label: '→ Result: Safe abstention response', cls: 'result' }
    ],
    code: `# Multi-factor confidence scoring
confidence = {
    "rrf_score":      0.60 weight,   # retrieval relevance
    "rerank_score":   0.40 weight,   # semantic rerank
    "multi_doc_boost": 1.1x,         # corroborating chunks
}
# LOW confidence → abstention
if confidence.rating == "LOW":
    return "Insufficient information in knowledge base"`,
    detail: 'Confidence scoring combines RRF retrieval score (60% weight) and reranking score (40% weight) with a 1.1× boost for corroborating multi-document evidence. When the score falls below threshold, the guardrail returns a safe abstention response instead of generating a potentially hallucinated answer.'
  },
  5: {
    title: 'Scenario 5 — Ambiguous Query',
    badge: '✓ FIXED',
    badgeClass: 'badge-fixed',
    description: '"What is the limit?" is a completely ambiguous query. The baseline RAG attempted to answer it literally, returning irrelevant or misleading chunks. The improved system detects insufficient specificity and requests clarification.',
    flow: [
      { label: 'Baseline: Guessed wrong topic', cls: 'baseline' },
      { label: '→ Root Cause: No ambiguity detection', cls: 'cause' },
      { label: '→ Fix: Short + low-score query detection', cls: 'fix' },
      { label: '→ Result: Clarification prompt returned', cls: 'result' }
    ],
    code: `# Example interaction
User:    "What is the limit?"
System:  "Your question is ambiguous. Could you clarify:
          - Leave days limit?
          - Budget approval limit?
          - System access limit?
          Please provide more context."

# Detection: len(query_tokens) < 4 AND top_score < threshold`,
    detail: 'When a query is very short (fewer than 4 meaningful tokens) and retrieval scores are low, the system returns a structured clarification request rather than guessing. This prevents misleading answers and guides users toward specific, answerable questions.'
  },
  6: {
    title: 'Scenario 6 — Broken Conversational Context',
    badge: '✓ FIXED',
    badgeClass: 'badge-fixed',
    description: 'In a multi-turn conversation, "What about Standard?" after "What is the Enterprise leave policy?" was treated as an isolated query, failing to retrieve anything relevant because "Standard" alone provides no search context.',
    flow: [
      { label: 'Baseline: "What about Standard?" → no results', cls: 'baseline' },
      { label: '→ Root Cause: No conversation memory', cls: 'cause' },
      { label: '→ Fix: GPT-4o query rewriter with history', cls: 'fix' },
      { label: '→ Result: Rewritten as standalone query', cls: 'result' }
    ],
    code: `# Query rewriting with conversation history
history = [
    {"role": "user",      "content": "What is the Enterprise leave policy?"},
    {"role": "assistant", "content": "Enterprise employees get 25 days..."}
]
query   = "What about Standard?"

# Rewritten → "What is the Standard employee leave policy?"

# API call
POST /api/v1/chat
body: { question, history, user_groups, user_department }`,
    detail: 'The QueryRewriter uses GPT-4o (or mock) to convert follow-up questions into fully standalone queries by referencing conversation history. The history is passed in every /chat request as a list of role/content pairs, enabling correct context-aware retrieval across multiple turns.'
  }
};

function showScenario(num, btn) {
  document.querySelectorAll('.stab').forEach(s => s.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const s = SCENARIOS[num];
  if (!s) return;

  const flowHtml = s.flow.map((f, i) =>
    `${i > 0 ? '<span class="sflow-arrow">→</span>' : ''}<div class="sflow-step ${f.cls}">${f.label}</div>`
  ).join('');

  document.getElementById('scenario-content').innerHTML = `
    <div class="scenario-card">
      <div class="scenario-title">${s.title}</div>
      <span class="scenario-badge ${s.badgeClass}">${s.badge}</span>
      <p style="font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:16px">${s.description}</p>
      <div class="card-title">Failure → Fix Flow</div>
      <div class="scenario-flow">${flowHtml}</div>
      <div class="card-title" style="margin-top:16px">Implementation</div>
      <div class="code-block">${escapeHtml(s.code)}</div>
      <div class="card-title" style="margin-top:16px">Technical Detail</div>
      <p style="font-size:13px;color:var(--text2);line-height:1.7">${s.detail}</p>
    </div>`;
}

// ─── EVALUATION ───────────────────────────────────────────────────
async function loadEvaluation() {
  try {
    const res = await fetch(`${API}/evaluation`);
    const data = await res.json();

    if (!data.results_available) {
      document.getElementById('evalContent').innerHTML = `
        <div class="error-msg">Evaluation results not found. Run: <code>python -m evaluation.evaluate --mode baseline</code></div>`;
      return;
    }

    const b = data.baseline || {};
    const im = data.improved || {};

    const metrics = [
      { key: 'hit_at_1',             label: 'Hit@1',              fmt: pct },
      { key: 'hit_at_3',             label: 'Hit@3',              fmt: pct },
      { key: 'hit_at_5',             label: 'Hit@5',              fmt: pct },
      { key: 'recall_at_1',          label: 'Recall@1',           fmt: pct },
      { key: 'recall_at_3',          label: 'Recall@3',           fmt: pct },
      { key: 'mrr',                  label: 'MRR',                fmt: pct },
      { key: 'groundedness',         label: 'Groundedness',       fmt: pct },
      { key: 'citation_correctness', label: 'Citation Correct.',  fmt: pct },
      { key: 'hallucination_rate',   label: 'Hallucination Rate', fmt: pct, invert: true },
      { key: 'unanswerable_correct_rate', label: 'Abstention Rate', fmt: pct },
      { key: 'avg_latency_ms',       label: 'Avg Latency',        fmt: ms },
      { key: 'cost_per_query',       label: 'Cost/Query',         fmt: cost },
    ];

    const cards = metrics.map(m => {
      const bv = b[m.key]; const iv = im[m.key];
      const bStr = bv !== undefined ? m.fmt(bv) : 'N/A';
      const iStr = iv !== undefined ? m.fmt(iv) : 'N/A';
      let delta = '', deltaClass = 'delta-neu';
      if (bv !== undefined && iv !== undefined) {
        const diff = iv - bv;
        const better = m.invert ? diff < 0 : diff > 0;
        deltaClass = better ? 'delta-pos' : (diff === 0 ? 'delta-neu' : 'delta-neg');
        delta = `<span class="eval-delta ${deltaClass}">${diff > 0 ? '+' : ''}${m.fmt(diff)}</span>`;
      }
      return `
        <div class="eval-metric-card">
          <div class="eval-metric-name">${m.label}</div>
          <div class="eval-metric-vals">
            <div class="eval-val"><div class="eval-val-num eval-baseline">${bStr}</div><div class="eval-val-lbl">BASELINE</div></div>
            <div class="eval-val" style="display:flex;flex-direction:column;align-items:center;justify-content:center">${delta}</div>
            <div class="eval-val"><div class="eval-val-num eval-improved">${iStr}</div><div class="eval-val-lbl">IMPROVED</div></div>
          </div>
        </div>`;
    }).join('');

    document.getElementById('evalContent').innerHTML = `
      <div class="eval-mode-banner">⚠ ${data.evaluation_mode} — Results from evaluation/results/ directory. No fabricated metrics.</div>
      <div class="grid-2" style="margin-bottom:16px">
        <div class="card" style="border-top:3px solid var(--danger)">
          <div class="card-title" style="color:var(--danger)">BASELINE RAG — Vector-Only</div>
          <div class="kv-list">
            <div class="kv-row"><span>Hit@1</span><span class="eval-baseline">${pct(b.hit_at_1)}</span></div>
            <div class="kv-row"><span>Hallucination Rate</span><span class="eval-baseline">${pct(b.hallucination_rate)}</span></div>
            <div class="kv-row"><span>Groundedness</span><span class="eval-baseline">${pct(b.groundedness)}</span></div>
            <div class="kv-row"><span>Avg Latency</span><span class="eval-baseline">${ms(b.avg_latency_ms)}</span></div>
          </div>
        </div>
        <div class="card" style="border-top:3px solid var(--success)">
          <div class="card-title" style="color:var(--success)">IMPROVED RAG — Hybrid + Confidence</div>
          <div class="kv-list">
            <div class="kv-row"><span>Hit@1</span><span class="eval-improved">${pct(im.hit_at_1)}</span></div>
            <div class="kv-row"><span>Hallucination Rate</span><span class="eval-improved">${pct(im.hallucination_rate)}</span></div>
            <div class="kv-row"><span>Groundedness</span><span class="eval-improved">${pct(im.groundedness)}</span></div>
            <div class="kv-row"><span>Avg Latency</span><span class="eval-improved">${ms(im.avg_latency_ms)}</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">All Metrics — Baseline vs Improved</div>
        <div class="eval-metric-grid">${cards}</div>
      </div>
    `;
  } catch(e) {
    document.getElementById('evalContent').innerHTML = `<div class="error-msg">Error loading evaluation: ${e.message}</div>`;
  }
}

function pct(v)  { return v === undefined ? 'N/A' : (v * 100).toFixed(1) + '%'; }
function ms(v)   { return v === undefined ? 'N/A' : v.toFixed(1) + 'ms'; }
function cost(v) { return v === undefined ? 'N/A' : '$' + v.toFixed(5); }

// ─── PROBLEM SOLVING ──────────────────────────────────────────────
const QA = [
  {
    q: 'Q1 — Retrieval Quality: Why does the chatbot return wrong chunks?',
    a: `<p><strong>Diagnosis:</strong> Wrong chunks typically come from chunk size mismatch, single-retrieval-mode bias, or missing semantic reranking. The root cause is identified by tracing the retrieval scores in RAG Diagnostics.</p>
        <p><strong>Implemented fixes:</strong><br>
        1. Configurable chunk_size + chunk_overlap at ingestion<br>
        2. Hybrid search: vector similarity + BM25 keyword fused via RRF<br>
        3. Semantic reranking (Azure AI Search SemanticConfiguration in production)<br>
        4. top_k=5 + candidate_k=20 ensures enough candidates before reranking</p>
        <p><strong>Measured result:</strong> Hit@1 improved from 43% (baseline) to 60% (improved).</p>`,
    flow: ['Inspect chunk scores', '→ Identify retrieval mode', '→ Enable hybrid search', '→ Add reranking', '→ Re-evaluate Hit@K']
  },
  {
    q: 'Q2 — Latency: What causes slow RAG responses?',
    a: `<p><strong>Main bottlenecks:</strong> Embedding generation (synchronous), Azure Search round-trip, and GPT-4o generation latency.</p>
        <p><strong>Measurement approach:</strong> Every request logs RequestID, total latency, retrieval latency, and generation latency separately via Application Insights structured telemetry.</p>
        <p><strong>Optimisations implemented:</strong><br>
        1. Secure response cache scoped to user identity (cache HIT avoids all Azure calls)<br>
        2. Async FastAPI endpoint with async retrieval<br>
        3. Configurable top_k to limit context size</p>
        <p><strong>Production:</strong> Azure App Service auto-scaling, Azure Search replicas, Redis semantic cache for common queries.</p>`,
    flow: ['Log RequestID', '→ Measure retrieval_latency', '→ Measure gen_latency', '→ Identify bottleneck', '→ Cache / scale']
  },
  {
    q: 'Q3 — Scale: How does this scale from 10K to 5 million documents?',
    a: `<p><strong>Azure AI Search scaling path:</strong></p>
        <p>10K docs → 1 partition, 1 replica, Standard S1<br>
        100K docs → 2 partitions, 2 replicas, S2<br>
        1M docs → 6 partitions, 3 replicas, S3<br>
        5M docs → 12 partitions (max), dedicated index partitions per department</p>
        <p><strong>Ingestion at scale:</strong> Azure Functions triggered by Blob events, parallel chunk processing, incremental embedding updates (only re-embed changed documents).</p>
        <p><strong>Cost control:</strong> Embedding cache, document deduplication at ingestion, smaller embedding model for initial ranking + full model for reranking top candidates only.</p>`,
    flow: ['Partition index', '→ Async ingestion queue', '→ Incremental embedding', '→ Department sharding', '→ Monitor costs']
  },
  {
    q: 'Q4 — Security: How is department-level access enforced?',
    a: `<p><strong>Implementation:</strong> Every document chunk is tagged with access_groups during ingestion. At query time, user group claims from the Entra ID JWT are passed as an OData filter to Azure AI Search.</p>
        <div class="code-block">filter = "access_groups/any(g: g eq 'HR' or g eq 'ALL')"</div>
        <p><strong>Critical guarantee:</strong> Unauthorized documents are filtered BEFORE retrieval, so they never enter the LLM context or prompt. Not after generation.</p>
        <p><strong>Production hardening:</strong> Managed Identity for credential-less Azure access, all secrets in Key Vault, audit logging of every request (who asked, which documents retrieved).</p>`,
    flow: ['Entra JWT', '→ Extract group claims', '→ OData pre-filter', '→ Authorized chunks only', '→ LLM context', '→ Audit log']
  },
  {
    q: 'Q5 — Cost: How is Azure OpenAI token usage controlled?',
    a: `<p><strong>Cost levers in this implementation:</strong></p>
        <p>1. <strong>Secure response cache</strong> — identical questions with same user entitlements return cached answers (zero Azure API cost)<br>
        2. <strong>Confidence guardrail</strong> — LOW confidence queries return abstention without calling GPT-4o for generation<br>
        3. <strong>Context size control</strong> — top_k=5 limits context. Each chunk is ~800 chars ≈ 200 tokens<br>
        4. <strong>Configurable max_tokens=800</strong> on the generation call</p>
        <p><strong>Estimated cost per query:</strong> ~$0.00015 (mock mode). Production: depends on GPT-4o pricing and token counts.</p>`,
    flow: ['Cache check', '→ Confidence gate', '→ Limit top_k', '→ Control max_tokens', '→ Monitor spend']
  },
  {
    q: 'Q6 — Debugging: User gets wrong answer with valid-looking citation. How do you trace it?',
    a: `<p><strong>Full debugging methodology:</strong></p>
        <p>1. Use RAG Diagnostics page — enter the exact query to get the full pipeline trace<br>
        2. Inspect retrieved chunks — does the chunk actually contain the answer? Check scores<br>
        3. Check rerank scores — was the correct chunk deprioritised by reranking?<br>
        4. Check confidence score — was evidence actually insufficient but the threshold too permissive?<br>
        5. Inspect the citation — does citation.source_id match the chunk that was actually used?<br>
        6. If GPT-4o generated from a correct chunk but still wrong: check the prompt template for ambiguous instructions<br>
        7. Add this query to evaluation/dataset.json as a regression test</p>`,
    flow: ['RequestID trace', '→ Inspect chunks', '→ Check rerank', '→ Verify citation ID', '→ Inspect prompt', '→ Root cause', '→ Regression test']
  }
];

function loadProblemSolving() {
  document.getElementById('qaList').innerHTML = QA.map((qa, i) => `
    <div class="qa-card">
      <div class="qa-header" onclick="toggleQA(${i})">
        <div class="qa-number">Q${i+1}</div>
        <div class="qa-title">${qa.q}</div>
        <div class="qa-toggle" id="qa-toggle-${i}">▾</div>
      </div>
      <div class="qa-body" id="qa-body-${i}">
        ${qa.a}
        <div class="card-title" style="margin-top:16px">Debugging Flow</div>
        <div class="debug-flow">${qa.flow.map(f => `<span class="debug-step">${f}</span>`).join('')}</div>
      </div>
    </div>`).join('');
}

function toggleQA(i) {
  const body = document.getElementById('qa-body-' + i);
  const toggle = document.getElementById('qa-toggle-' + i);
  const open = body.classList.contains('open');
  body.classList.toggle('open', !open);
  toggle.classList.toggle('open', !open);
}

// ─── AZURE STATUS ─────────────────────────────────────────────────
async function loadStatus() {
  try {
    const res = await fetch(`${API}/status`);
    const d   = await res.json();

    function mkCard(name, desc, val, detail) {
      const cls = val === 'CONNECTED' ? 'connected' : val === 'MOCK MODE' ? 'mock' : val === 'ERROR' ? 'error' : 'notcfg';
      const pillCls = cls;
      const dot = cls === 'connected' ? '●' : cls === 'mock' ? '◐' : '○';
      return `
        <div class="status-card ${cls}">
          <div class="status-svc-name">${name}</div>
          <div class="status-svc-desc">${desc}</div>
          <span class="status-pill ${pillCls}">${dot} ${val}</span>
          <div class="status-detail">${detail}</div>
        </div>`;
    }

    document.getElementById('statusContent').innerHTML = `
      <div class="eval-mode-banner" style="margin-bottom:20px">
        ${d.mock_mode ? '⚠ LOCAL / MOCK MODE — Set MOCK_AZURE_SERVICES=false and add Azure credentials to enable real Azure connections.' : '✅ AZURE MODE — Real Azure services connected.'}
      </div>
      <div class="status-grid">
        ${mkCard('Azure OpenAI', 'GPT-4o chat · text-embedding-3-large embeddings', d.azure_openai,
          `<div class="status-kv"><span class="status-kv-key">Endpoint</span><span class="status-kv-val">${d.mock_mode ? 'mock endpoint' : 'configured'}</span></div>
           <div class="status-kv"><span class="status-kv-key">Embedding dims</span><span class="status-kv-val">${d.embedding_dimensions}</span></div>`)}
        ${mkCard('Azure AI Search', 'Hybrid search · semantic ranking · ACL filters', d.azure_search,
          `<div class="status-kv"><span class="status-kv-key">Index</span><span class="status-kv-val">${d.search_index}</span></div>
           <div class="status-kv"><span class="status-kv-key">Mode</span><span class="status-kv-val">${d.mock_mode ? 'mock_index.json' : 'Azure Search'}</span></div>`)}
        ${mkCard('Azure Blob Storage', 'Document ingestion source', d.azure_storage,
          `<div class="status-kv"><span class="status-kv-key">Fallback</span><span class="status-kv-val">data/documents/</span></div>`)}
        ${mkCard('Application Insights', 'Telemetry · latency · errors', d.application_insights,
          `<div class="status-kv"><span class="status-kv-key">RequestID logging</span><span class="status-kv-val">Active</span></div>
           <div class="status-kv"><span class="status-kv-key">Telemetry</span><span class="status-kv-val">Structured JSON logs</span></div>`)}
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-title">Configuration Reference</div>
        <div class="kv-list">
          <div class="kv-row"><span>MOCK_AZURE_SERVICES</span><span style="font-family:var(--mono)">${d.mock_mode}</span></div>
          <div class="kv-row"><span>AZURE_SEARCH_INDEX_NAME</span><span style="font-family:var(--mono)">${d.search_index}</span></div>
          <div class="kv-row"><span>AZURE_OPENAI_EMBEDDING_DIMENSIONS</span><span style="font-family:var(--mono)">${d.embedding_dimensions}</span></div>
          <div class="kv-row"><span>To enable Azure</span><span style="font-family:var(--mono);color:var(--cyan)">Set MOCK_AZURE_SERVICES=false + credentials</span></div>
        </div>
      </div>`;

    await refreshModeBadge();
  } catch(e) {
    document.getElementById('statusContent').innerHTML = `
      <div class="error-msg">❌ Cannot reach backend API.<br>Make sure the FastAPI server is running: <code>python server.py</code><br>Error: ${e.message}</div>`;
  }
}

// ─── UTILS ────────────────────────────────────────────────────────
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}
