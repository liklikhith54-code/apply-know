import logging
from pathlib import Path
from typing import Dict, Any, List
import pypdf
import docx2txt

logger = logging.getLogger(__name__)

class DocumentParser:
    """Parses raw document files (.pdf, .docx, .txt) and extracts text structure, page numbers, and section names."""

    def __init__(self):
        pass

    def parse(self, file_path: Path) -> Dict[str, Any]:
        """Parses a document file and returns structured text, page numbers, and name.

        Returns:
            Dict containing:
                "document_name": str
                "text": str (concatenated text)
                "pages": List[Dict[str, Any]] (each with page_number and text)
                "sections": List[Dict[str, Any]] (each with section name and offset/text)
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = path.suffix.lower()
        logger.info(f"Parsing document {path.name} with extension: {ext}")

        if ext == ".pdf":
            return self._parse_pdf(path)
        elif ext == ".docx":
            return self._parse_docx(path)
        elif ext in (".txt", ".md"):
            return self._parse_txt(path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def _parse_pdf(self, path: Path) -> Dict[str, Any]:
        pages = []
        full_text = []
        try:
            with open(path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for idx, page in enumerate(reader.pages):
                    page_text = page.extract_text() or ""
                    pages.append({
                        "page_number": idx + 1,
                        "text": page_text
                    })
                    full_text.append(page_text)
        except Exception as e:
            logger.error(f"Error parsing PDF file {path.name}: {e}", exc_info=True)
            raise

        return {
            "document_name": path.name,
            "text": "\n".join(full_text),
            "pages": pages,
            "sections": self._heuristically_extract_sections("\n".join(full_text))
        }

    def _parse_docx(self, path: Path) -> Dict[str, Any]:
        try:
            text = docx2txt.process(str(path)) or ""
        except Exception as e:
            logger.error(f"Error parsing DOCX file {path.name}: {e}", exc_info=True)
            raise

        # DOCX doesn't have native pagination in docx2txt, treat as single page
        pages = [{"page_number": 1, "text": text}]
        return {
            "document_name": path.name,
            "text": text,
            "pages": pages,
            "sections": self._heuristically_extract_sections(text)
        }

    def _parse_txt(self, path: Path) -> Dict[str, Any]:
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception as e:
            logger.error(f"Error parsing TXT file {path.name}: {e}", exc_info=True)
            raise

        pages = [{"page_number": 1, "text": text}]
        return {
            "document_name": path.name,
            "text": text,
            "pages": pages,
            "sections": self._heuristically_extract_sections(text)
        }

    def _heuristically_extract_sections(self, text: str) -> List[Dict[str, Any]]:
        """Heuristically identify headers (e.g., lines starting with # or capital letters like SECTION 1)."""
        sections = []
        lines = text.split("\n")
        current_section = "General"
        section_text = []

        for line in lines:
            trimmed = line.strip()
            # Look for markdown header or typical section titles
            is_header = False
            if trimmed.startswith("#"):
                is_header = True
                clean_title = trimmed.lstrip("#").strip()
            elif trimmed.isupper() and len(trimmed) > 3 and any(x in trimmed for x in ["SECTION", "POLICY", "CHAPTER", "ARTICLE"]):
                is_header = True
                clean_title = trimmed
            
            if is_header:
                if section_text:
                    sections.append({
                        "name": current_section,
                        "text": "\n".join(section_text)
                    })
                current_section = clean_title
                section_text = [trimmed]
            else:
                section_text.append(line)

        # Add trailing section
        if section_text:
            sections.append({
                "name": current_section,
                "text": "\n".join(section_text)
            })

        return sections
