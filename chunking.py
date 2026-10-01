"""
chunking.py
-----------
Text cleaning and deterministic chunking logic for documents.
Converts raw page text into clean, overlapping text chunks with page number metadata.
No LLM calls are used here because chunking is purely deterministic.
"""

import re
import config

def clean_text(text: str) -> str:
    """
    Cleans raw extracted document text:
    1. Fixes hyphenated words split across lines (e.g., 'docu-\\nment' -> 'document').
    2. Replaces multiple newlines/tabs/spaces with clean whitespace.
    3. Strips leading/trailing spaces.
    """
    if not text:
        return ""
    
    # 1. Join words split by hyphen at end of line (e.g. "analy-\nsis" -> "analysis")
    cleaned = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
    
    # 2. Replace newlines and extra whitespaces with a single space
    cleaned = re.sub(r'[\r\n\t]+', ' ', cleaned)
    cleaned = re.sub(r'\s{2,}', ' ', cleaned)
    
    return cleaned.strip()

def create_chunks_from_pages(
    pages: list[dict],
    chunk_size: int = config.CHUNK_SIZE,
    chunk_overlap: int = config.CHUNK_OVERLAP
) -> list[dict]:
    """
    Splits pages of document text into metadata-rich chunks.
    
    Parameters:
    - pages: List of dicts, e.g., [{"page_num": 1, "text": "..."}, ...]
    - chunk_size: Target max characters per chunk (default ~1000)
    - chunk_overlap: Characters repeated from previous chunk to prevent split context (default ~150)
    
    Returns:
    - List of chunk dicts:
      [
        {
          "chunk_id": "chunk_0",
          "text": "Cleaned chunk text...",
          "page_num": 1,
          "chunk_index": 0
        },
        ...
      ]
    """
    chunks = []
    global_chunk_idx = 0

    for page_info in pages:
        page_num = page_info.get("page_num", 1)
        raw_text = page_info.get("text", "")
        cleaned_text = clean_text(raw_text)

        if not cleaned_text:
            continue

        # If page text is smaller than chunk_size, keep it as a single chunk
        if len(cleaned_text) <= chunk_size:
            chunks.append({
                "chunk_id": f"chunk_{global_chunk_idx}",
                "text": cleaned_text,
                "page_num": page_num,
                "chunk_index": global_chunk_idx
            })
            global_chunk_idx += 1
            continue

        # Split text into overlapping windows
        start = 0
        text_len = len(cleaned_text)

        while start < text_len:
            end = start + chunk_size

            # If not at the end of text, try to break at space/punctuation to avoid splitting words
            if end < text_len:
                break_point = cleaned_text.rfind(' ', start, end)
                if break_point > start + (chunk_size // 2):
                    end = break_point

            chunk_str = cleaned_text[start:end].strip()

            if chunk_str:
                chunks.append({
                    "chunk_id": f"chunk_{global_chunk_idx}",
                    "text": chunk_str,
                    "page_num": page_num,
                    "chunk_index": global_chunk_idx
                })
                global_chunk_idx += 1

            # Advance start by (chunk_size - chunk_overlap)
            step = chunk_size - chunk_overlap
            start += max(1, step)

            # Prevent infinite loop if step doesn't advance
            if start >= text_len or end >= text_len:
                break

    return chunks
