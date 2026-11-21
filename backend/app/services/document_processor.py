"""
Document Ingestion & Text Chunking Service (Phase 6)
Handles secure upload, file signature validation, text extraction,
and deterministic sliding-window chunking for government training manuals (PDF, TXT, MD).
"""
import io
import os
import re
import uuid
from typing import Any, Dict, List, Tuple
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.models.document import DocumentChunk, TrainingDocument

# Configuration Constants
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/octet-stream",  # Often sent for plain text files
}

# Chunking targets (approx 600 words / ~600-800 tokens with 100-word overlap)
TARGET_CHUNK_WORDS = 600
OVERLAP_CHUNK_WORDS = 100


def sanitize_filename(filename: str) -> str:
    """Sanitizes filename removing unsafe path components and special characters."""
    clean_name = os.path.basename(filename)
    # Remove null bytes and directory traversal characters
    clean_name = clean_name.replace("\x00", "").replace("/", "").replace("\\", "")
    # Keep only alphanumeric, hyphens, underscores, and dots
    clean_name = re.sub(r"[^a-zA-Z0-9._-]", "_", clean_name)
    if not clean_name or clean_name.startswith("."):
        clean_name = f"document_{uuid.uuid4().hex[:8]}.txt"
    return clean_name


def validate_file_content(file_bytes: bytes, filename: str, mime_type: str) -> str:
    """Validates file size, extension, MIME type, and magic bytes signature.
    Returns normalized extension (e.g. '.pdf', '.txt', '.md').
    """
    # 1. Size check
    if not file_bytes or len(file_bytes) == 0:
        raise ValueError("Uploaded file is empty (0 bytes).")
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File size exceeds maximum limit of 15 MB ({len(file_bytes)} bytes).")

    # 2. Extension check
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file extension '{ext}'. Allowed: .pdf, .txt, .md")

    # 3. MIME check (if provided and non-empty)
    if mime_type and mime_type.lower() not in ALLOWED_MIME_TYPES:
        raise ValueError(f"Unsupported MIME type '{mime_type}'.")

    # 4. Signature check (magic bytes)
    if ext == ".pdf":
        if not file_bytes.startswith(b"%PDF"):
            raise ValueError("Invalid PDF file: Missing %PDF header signature.")
    else:
        # TXT or MD must be valid decodable text
        try:
            sample = file_bytes[:4096].decode("utf-8")
        except UnicodeDecodeError:
            try:
                sample = file_bytes[:4096].decode("latin-1")
            except Exception:
                raise ValueError("Binary or unreadable text encoding. UTF-8 or ASCII required.")

    return ext


def extract_clean_text(file_bytes: bytes, ext: str) -> str:
    """Extracts clean text from PDF, TXT, or Markdown bytes without external servers."""
    if ext == ".pdf":
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            if reader.is_encrypted:
                raise ValueError("Encrypted or password-protected PDFs are not supported.")
            pages_text = []
            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                clean_page = page_text.strip()
                if clean_page:
                    pages_text.append(clean_page)
            full_text = "\n\n".join(pages_text).strip()
            if not full_text:
                raise ValueError("PDF contains no extractable text (scanned images or empty pages).")
            return full_text
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Corrupted or malformed PDF document: {str(e)}")
    else:
        # TXT or Markdown
        for encoding in ("utf-8", "utf-8-sig", "latin-1"):
            try:
                text = file_bytes.decode(encoding).strip()
                if not text:
                    raise ValueError("Document contains no text content.")
                return text
            except UnicodeDecodeError:
                continue
        raise ValueError("Unable to decode text document using UTF-8 or Latin-1.")


def chunk_text(text: str, target_words: int = TARGET_CHUNK_WORDS, overlap_words: int = OVERLAP_CHUNK_WORDS) -> List[str]:
    """Splits text into overlapping word-bounded chunks preserving sentence structure.
    Targeting approximately 500-800 tokens (approx 600 words) with 100-word overlap.
    """
    # Normalize whitespaces while preserving paragraph breaks
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text.strip()]

    # Collect sentences or small fragments
    units: List[str] = []
    for para in paragraphs:
        # Split on sentence terminals
        sentences = re.split(r"(?<=[.!?])\s+", para)
        for s in sentences:
            clean_s = s.strip()
            if clean_s:
                units.append(clean_s)

    chunks: List[str] = []
    current_words: List[str] = []

    for unit in units:
        unit_words = unit.split()
        if not unit_words:
            continue

        if len(current_words) + len(unit_words) <= target_words:
            current_words.extend(unit_words)
        else:
            if current_words:
                chunks.append(" ".join(current_words))
                # Create overlap by taking the last `overlap_words` words
                if len(current_words) > overlap_words:
                    current_words = current_words[-overlap_words:] + unit_words
                else:
                    current_words = unit_words
            else:
                # Unit itself is longer than target_words
                chunks.append(" ".join(unit_words[:target_words]))
                current_words = unit_words[target_words - overlap_words:]

    if current_words:
        chunks.append(" ".join(current_words))

    # Fallback if no chunks produced (e.g. text without sentence terminals)
    if not chunks and text.strip():
        words = text.strip().split()
        step = max(1, target_words - overlap_words)
        for i in range(0, len(words), step):
            chunk = " ".join(words[i : i + target_words])
            if chunk:
                chunks.append(chunk)

    return chunks


def process_and_store_document(
    db: Session,
    file_bytes: bytes,
    original_filename: str,
    mime_type: str,
    title: str,
    uploader_id: uuid.UUID,
    storage_dir: str = "storage/documents",
) -> Tuple[TrainingDocument, List[DocumentChunk]]:
    """Validates, stores file securely on disk, extracts text, generates chunks,
    and records TrainingDocument and DocumentChunks in the database.
    """
    # 1. Validate content
    ext = validate_file_content(file_bytes, original_filename, mime_type)
    clean_name = sanitize_filename(original_filename)

    # 2. Extract text before filesystem commit
    extracted_text = extract_clean_text(file_bytes, ext)

    # 3. Secure disk storage
    doc_id = uuid.uuid4()
    os.makedirs(storage_dir, exist_ok=True)
    stored_filename = f"{doc_id}_{clean_name}"
    file_path = os.path.join(storage_dir, stored_filename)

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # 4. Create TrainingDocument record
    doc = TrainingDocument(
        id=doc_id,
        title=title.strip() if title and title.strip() else clean_name,
        file_name=clean_name,
        file_path=file_path,
        file_size_bytes=len(file_bytes),
        mime_type=mime_type or f"application/{ext.lstrip('.')}",
        status="pending",
        uploaded_by=uploader_id,
    )
    db.add(doc)
    db.flush()

    try:
        # 5. Chunk text
        text_chunks = chunk_text(extracted_text)
        created_chunks: List[DocumentChunk] = []

        for idx, chunk_str in enumerate(text_chunks):
            # Token estimation: words * 1.3 approx tokens
            word_count = len(chunk_str.split())
            token_est = int(word_count * 1.3)

            meta: Dict[str, Any] = {
                "document_id": str(doc.id),
                "document_title": doc.title,
                "chunk_index": idx,
                "character_count": len(chunk_str),
                "word_count": word_count,
            }

            dc = DocumentChunk(
                document_id=doc.id,
                chunk_index=idx,
                chunk_text=chunk_str,
                token_count=token_est,
                metadata_json=meta,
            )
            db.add(dc)
            created_chunks.append(dc)

        doc.status = "processed"
        db.commit()
        db.refresh(doc)
        return doc, created_chunks

    except Exception as e:
        db.rollback()
        # Mark document as failed
        doc.status = "failed"
        db.commit()
        raise ValueError(f"Document chunking failed: {str(e)}")
