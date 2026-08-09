import logging
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Enterprise Knowledge Assistant",
    description="Production-ready RAG-based Enterprise Knowledge Assistant",
    version="1.0.0"
)

# Include API Router
app.include_router(api_router, prefix="/api/v1")

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "enterprise-rag-assistant"}

@app.get("/", response_class=HTMLResponse, tags=["UI"])
async def get_ui():
    """Serves a simple, fully functional playground UI for RAG querying."""
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Enterprise Knowledge Assistant - Playground</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f5f7fa; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #0078d4; margin-top: 0; }
            .form-group { margin-bottom: 15px; }
            label { display: block; font-weight: bold; margin-bottom: 5px; }
            input[type="text"], select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
            button { background-color: #0078d4; color: white; border: none; padding: 12px 20px; font-size: 16px; border-radius: 4px; cursor: pointer; font-weight: bold; }
            button:hover { background-color: #005a9e; }
            .section { margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; }
            .result-card { background-color: #f3f6f9; padding: 15px; border-left: 4px solid #0078d4; margin-bottom: 15px; border-radius: 4px; }
            .meta-badge { display: inline-block; background-color: #e1dfdd; padding: 4px 8px; font-size: 12px; border-radius: 4px; margin-right: 5px; font-weight: bold; }
            .citation-item { font-size: 14px; margin-bottom: 5px; color: #555; }
            .source-card { border: 1px solid #ddd; padding: 10px; border-radius: 4px; margin-bottom: 10px; background-color: #fafafa; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Enterprise Knowledge Assistant</h1>
            <p>Production-ready RAG Playground UI (Phase 17)</p>
            
            <div class="form-group">
                <label for="question">User Question:</label>
                <input type="text" id="question" value="What is the annual leave allocation in the 2026 Leave Policy?" placeholder="Enter your question here...">
            </div>

            <div class="form-group" style="display: flex; gap: 15px;">
                <div style="flex: 1;">
                    <label for="user_groups">User Access Groups (comma-separated):</label>
                    <input type="text" id="user_groups" value="ALL, HR">
                </div>
                <div style="flex: 1;">
                    <label for="user_department">User Department:</label>
                    <input type="text" id="user_department" value="HR">
                </div>
            </div>

            <button onclick="askQuestion()">Submit Query</button>

            <div id="loader" style="display:none; margin-top: 15px; font-weight: bold; color: #0078d4;">Running pipeline...</div>

            <div class="section" id="results-section" style="display:none;">
                <h2>Answer</h2>
                <div class="result-card">
                    <div style="margin-bottom: 10px;">
                        <span class="meta-badge" id="conf-badge">Confidence: High</span>
                        <span class="meta-badge" id="latency-badge">Latency: 0ms</span>
                    </div>
                    <div id="answer-text" style="line-height: 1.6; white-space: pre-wrap;"></div>
                </div>

                <h2>Citations</h2>
                <div id="citations-list" style="margin-bottom: 15px;"></div>

                <h2>Retrieved Sources (Context Block)</h2>
                <div id="sources-list"></div>
            </div>
        </div>

        <script>
            async function askQuestion() {
                const question = document.getElementById("question").value;
                const groups = document.getElementById("user_groups").value.split(",").map(s => s.trim()).filter(Boolean);
                const dept = document.getElementById("user_department").value;
                
                document.getElementById("loader").style.display = "block";
                document.getElementById("results-section").style.display = "none";

                try {
                    const response = await fetch("/api/v1/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            question: question,
                            history: [],
                            user_groups: groups,
                            user_department: dept
                        })
                    });

                    const data = await response.json();
                    
                    document.getElementById("answer-text").innerText = data.answer;
                    document.getElementById("conf-badge").innerText = "Confidence: " + data.confidence;
                    document.getElementById("conf-badge").style.backgroundColor = data.confidence === 'High' ? '#dff6dd' : (data.confidence === 'Medium' ? '#fff4ce' : '#fde7e9');
                    document.getElementById("conf-badge").style.color = data.confidence === 'High' ? '#107c41' : (data.confidence === 'Medium' ? '#794500' : '#a80000');
                    document.getElementById("latency-badge").innerText = "Latency: " + Math.round(data.latency_ms) + "ms";

                    // Citations
                    const citesDiv = document.getElementById("citations-list");
                    citesDiv.innerHTML = "";
                    if (data.citations.length === 0) {
                        citesDiv.innerHTML = "<em>No citations referenced.</em>";
                    } else {
                        data.citations.forEach((c, idx) => {
                            citesDiv.innerHTML += `<div class="citation-item">[${idx + 1}] ${c.document_name} &mdash; Page ${c.page || 'N/A'} &mdash; Section ${c.section} (ID: ${c.source_id})</div>`;
                        });
                    }

                    // Sources
                    const sourcesDiv = document.getElementById("sources-list");
                    sourcesDiv.innerHTML = "";
                    if (data.retrieved_documents.length === 0) {
                        sourcesDiv.innerHTML = "<em>No documents retrieved.</em>";
                    } else {
                        data.retrieved_documents.forEach((doc, idx) => {
                            sourcesDiv.innerHTML += `
                                <div class="source-card">
                                    <div style="font-weight: bold; margin-bottom: 5px; color: #0078d4;">
                                        [Source ${idx + 1}] ${doc.document_name} (Score: ${doc.score.toFixed(3)})
                                    </div>
                                    <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                                        Section: ${doc.section} | Page: ${doc.page_number || 'N/A'} | ID: ${doc.id}
                                    </div>
                                    <div style="font-size: 14px; line-height: 1.5; color: #333; background: #fff; padding: 8px; border: 1px solid #eee;">
                                        ${doc.content}
                                    </div>
                                </div>
                            `;
                        });
                    }

                    document.getElementById("results-section").style.display = "block";
                } catch (err) {
                    alert("RAG query failed: " + err.message);
                } finally {
                    document.getElementById("loader").style.display = "none";
                }
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)
