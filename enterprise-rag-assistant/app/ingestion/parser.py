import logging
import hashlib
from pathlib import Path
from typing import Dict, Any, List
import pypdf
import docx2txt

logger = logging.getLogger(__name__)

class DocumentParser:
    """Parses local document files (.pdf, .docx, .txt) and returns structured page extraction details."""

    def __init__(self):
        pass

    def parse(self, file_path: Path) -> List[Dict[str, Any]]:
        """Parses a document file and returns a list of pages/segments with metadata.

        Returns:
            List of dictionaries, each containing:
                "document_id": str (hashed of file content/name)
                "document_name": str
                "text": str (segment/page text content)
                "page_number": Optional[int] (1-indexed page where available)
                "file_type": str (extension suffix)
                "source": str (reference string)
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found at path: {file_path}")

        ext = path.suffix.lower()
        doc_name = path.name
        doc_id = hashlib.md5(doc_name.encode('utf-8')).hexdigest()
        
        logger.info(f"Parsing document: {doc_name} (Format: {ext})")

        if ext == ".pdf":
            return self._parse_pdf(path, doc_id, doc_name)
        elif ext == ".docx":
            return self._parse_docx(path, doc_id, doc_name)
        elif ext in (".txt", ".md"):
            return self._parse_txt(path, doc_id, doc_name)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def _parse_pdf(self, path: Path, doc_id: str, doc_name: str) -> List[Dict[str, Any]]:
        segments = []
        try:
            with open(path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for idx, page in enumerate(reader.pages):
                    page_text = page.extract_text() or ""
                    segments.append({
                        "document_id": doc_id,
                        "document_name": doc_name,
                        "text": page_text.strip(),
                        "page_number": idx + 1,
                        "file_type": "pdf",
                        "source": f"{doc_name}#page={idx + 1}"
                    })
        except Exception as e:
            logger.error(f"Error parsing PDF file {doc_name}: {e}", exc_info=True)
            raise
        return segments

    def _parse_docx(self, path: Path, doc_id: str, doc_name: str) -> List[Dict[str, Any]]:
        try:
            text = docx2txt.process(str(path)) or ""
        except Exception as e:
            logger.error(f"Error parsing DOCX file {doc_name}: {e}", exc_info=True)
            raise

        # DOCX lacks native pagination in docx2txt, treat as single segment
        return [{
            "document_id": doc_id,
            "document_name": doc_name,
            "text": text.strip(),
            "page_number": 1,
            "file_type": "docx",
            "source": f"{doc_name}#page=1"
        }]

    def _parse_txt(self, path: Path, doc_id: str, doc_name: str) -> List[Dict[str, Any]]:
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception as e:
            logger.error(f"Error parsing TXT file {doc_name}: {e}", exc_info=True)
            raise

        return [{
            "document_id": doc_id,
            "document_name": doc_name,
            "text": text.strip(),
            "page_number": 1,
            "file_type": "txt",
            "source": f"{doc_name}#page=1"
        }]
