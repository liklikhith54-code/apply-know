import logging
import re
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class MetadataExtractor:
    """Enriches chunk metadata with structural parameters parsed from document text (versions, dates, access rights)."""

    def __init__(self):
        # Compiled patterns for parsing
        self.version_pattern = re.compile(r'(?:version|v)[\s:]*(\d+\.\d+)', re.IGNORECASE)
        self.date_pattern = re.compile(r'(?:effective date|date)[\s:]*([\d\w\s,-]{6,20})', re.IGNORECASE)
        self.dept_pattern = re.compile(r'(?:department|dept)[\s:]*([a-zA-Z\s]{2,15})', re.IGNORECASE)

    def extract_metadata(self, text: str, document_name: str) -> Dict[str, Any]:
        """Scans the text of a document to extract structure metrics.

        Args:
            text: Full text of the document (or initial page text)
            document_name: Name of the file

        Returns:
            Dict containing metadata attributes.
        """
        # Sensible defaults based on filename
        doc_type = self._infer_doc_type(document_name)
        dept = self._infer_department(text, document_name)
        version = self._extract_version(text)
        effective_date = self._extract_date(text)
        
        # Default access groups mapping
        access_groups = ["ALL"]
        if dept in ("HR", "Human Resources"):
            access_groups = ["HR", "ADMIN"]
        elif dept == "Finance":
            access_groups = ["Finance", "ADMIN"]
        elif dept == "Legal":
            access_groups = ["Legal", "ADMIN"]
        elif dept == "Engineering":
            access_groups = ["Engineering", "ADMIN"]

        return {
            "version": version,
            "effective_date": effective_date,
            "department": dept,
            "document_type": doc_type,
            "access_groups": access_groups
        }

    def _infer_doc_type(self, doc_name: str) -> str:
        name_lower = doc_name.lower()
        if "policy" in name_lower:
            return "Policy"
        elif "manual" in name_lower or "guide" in name_lower:
            return "Manual"
        elif "report" in name_lower:
            return "Report"
        elif "faq" in name_lower:
            return "FAQ"
        return "Standard Document"

    def _infer_department(self, text: str, doc_name: str) -> str:
        combined = f"{doc_name} {text[:1000]}".lower()
        
        # Try explicit extraction first
        match = self.dept_pattern.search(combined)
        if match:
            extracted = match.group(1).strip()
            # Standardize
            for standard in ["HR", "Finance", "Legal", "Engineering"]:
                if standard.lower() in extracted.lower():
                    return standard

        # Heuristic matching
        if "leave" in combined or "employee" in combined or "hiring" in combined or "hr" in combined:
            return "HR"
        elif "reimbursement" in combined or "expense" in combined or "finance" in combined or "audit" in combined:
            return "Finance"
        elif "agreement" in combined or "contract" in combined or "legal" in combined or "compliance" in combined:
            return "Legal"
        elif "code" in combined or "engineering" in combined or "software" in combined or "architecture" in combined:
            return "Engineering"
            
        return "General"

    def _extract_version(self, text: str) -> str:
        # Search first 2000 characters for version label
        search_block = text[:2000]
        match = self.version_pattern.search(search_block)
        if match:
            return match.group(1).strip()
        
        # Look for years in document title/text as version indicators
        if "2024" in search_block:
            return "2024.0"
        elif "2025" in search_block:
            return "2025.0"
        elif "2026" in search_block:
            return "2026.0"
            
        return "1.0"

    def _extract_date(self, text: str) -> str:
        # Search first 2000 characters
        search_block = text[:2000]
        match = self.date_pattern.search(search_block)
        if match:
            return match.group(1).strip()
        
        # Standard default date
        return "2026-01-01"
