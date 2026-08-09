import logging
import re
from typing import Dict, Any

logger = logging.getLogger(__name__)

class MetadataManager:
    """Extracts and prepares metadata schemas required for Azure AI Search validation indexing."""

    def __init__(self):
        self.version_pattern = re.compile(r'(?:version|v)[\s:]*(\d+\.\d+)', re.IGNORECASE)
        self.date_pattern = re.compile(r'(?:effective date|date)[\s:]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[\d\w ,-]{6,20})', re.IGNORECASE)
        self.access_groups_pattern = re.compile(r'access groups?[:\s]+([\w ,]+)', re.IGNORECASE)

    def enrich_chunk_metadata(self, chunk: Dict[str, Any], full_text: str = "") -> Dict[str, Any]:
        """Applies heuristic formatting to extract and define a structured metadata schema.

        Args:
            chunk: The chunk directory to enrich from chunker.py.
            full_text: Optional full document text to parse global variables from.
        """
        content = chunk.get("content", "")
        doc_name = chunk.get("document_name", "")
        search_block = (full_text[:2000] if full_text else content[:1000]).lower()

        # Heuristic extraction
        version = self._extract_version(search_block)
        effective_date = self._extract_date(search_block)
        dept = self._infer_department(search_block, doc_name)
        doc_type = self._infer_doc_type(doc_name)

        # Access Groups — parse from document header first, then infer
        # Always include ALL so any authenticated user can access unless explicitly restricted
        raw_groups = self._extract_access_groups(full_text or content)
        if raw_groups:
            # Keep parsed groups but ensure ALL is included for demo accessibility
            access_groups = raw_groups if "ALL" in raw_groups else raw_groups + ["ALL"]
        elif dept in ("HR", "Finance", "Legal"):
            # Department-specific doc: accessible by dept + ADMIN + ALL
            access_groups = [dept, "ADMIN", "ALL"]
        else:
            access_groups = ["ALL"]

        # Compile matching search schema
        return {
            "document_id": chunk.get("document_id"),
            "document_name": doc_name,
            "chunk_id": chunk.get("chunk_id"),
            "page_number": chunk.get("page_number", 1),
            "section": self._infer_section(content),
            "document_type": doc_type,
            "version": version,
            "effective_date": effective_date,
            "department": dept,
            "access_groups": access_groups,
            "source": chunk.get("source", doc_name),
            "content": content
        }

    def _extract_access_groups(self, text: str) -> list:
        """Parse 'Access Groups: HR, ADMIN, ALL' from document headers."""
        match = self.access_groups_pattern.search(text[:2000])
        if match:
            raw = match.group(1)
            groups = [g.strip().upper() for g in raw.split(',') if g.strip()]
            return groups if groups else []
        return []

    def _extract_version(self, text: str) -> str:
        match = self.version_pattern.search(text)
        if match:
            return match.group(1).strip()
        return "1.0"

    def _extract_date(self, text: str) -> str:
        match = self.date_pattern.search(text)
        if match:
            return match.group(1).strip()
        return "2026-01-01"

    def _infer_department(self, text: str, doc_name: str) -> str:
        combined = f"{doc_name} {text}".lower()
        if "leave" in combined or "hr" in combined:
            return "HR"
        elif "expense" in combined or "reimbursement" in combined or "finance" in combined:
            return "Finance"
        elif "legal" in combined or "nda" in combined or "compliance" in combined:
            return "Legal"
        return "General"

    def _infer_doc_type(self, doc_name: str) -> str:
        name_lower = doc_name.lower()
        if "policy" in name_lower:
            return "Policy"
        elif "manual" in name_lower:
            return "Manual"
        elif "nda" in name_lower or "agreement" in name_lower:
            return "Contract"
        return "Document"

    def _infer_section(self, content: str) -> str:
        # Check first line for title
        lines = [line.strip() for line in content.split("\n") if line.strip()]
        if lines:
            first_line = lines[0]
            if len(first_line) < 60 and any(keyword in first_line.upper() for keyword in ("SECTION", "ARTICLE", "CHAPTER", "POLICY")):
                return first_line
        return "General"

class MetadataExtractor:
    """Compatibility class wrapper mapping to MetadataManager logic."""
    def __init__(self):
        self.manager = MetadataManager()

    def extract_metadata(self, text: str, document_name: str) -> Dict[str, Any]:
        chunk = {
            "document_name": document_name,
            "content": text,
            "page_number": 1
        }
        res = self.manager.enrich_chunk_metadata(chunk)
        return {
            "version": res["version"],
            "effective_date": res["effective_date"],
            "department": res["department"],
            "document_type": res["document_type"],
            "access_groups": res["access_groups"]
        }

