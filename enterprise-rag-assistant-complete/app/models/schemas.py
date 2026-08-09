from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ChatRequest(BaseModel):
    question: str = Field(..., description="The user query to RAG on")
    history: List[Dict[str, str]] = Field(default_factory=list, description="Conversation history list of role/content dicts")
    user_department: Optional[str] = Field(None, description="Department for access control filtering")
    user_groups: List[str] = Field(default_factory=list, description="Access groups for document entitlement filtering")
    search_mode: str = Field("hybrid", description="Search style: hybrid, vector, or keyword")
    top_k: int = Field(5, description="Number of documents to retrieve")

class Citation(BaseModel):
    document_name: str
    page: Optional[int] = None
    section: Optional[str] = None
    source_id: str

class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    confidence: str
    retrieved_documents: List[Dict[str, Any]]
    latency_ms: float
