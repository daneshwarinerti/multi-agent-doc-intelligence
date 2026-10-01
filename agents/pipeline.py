"""
agents/pipeline.py
------------------
Sequential Ingestion Pipeline module for document processing.
Coordinates Extractor, Summarizer, and Insights agents in sequence:
1. Extractor: File Parsing -> Cleaning & Chunking -> ChromaDB Storage
2. Summarizer: Map-Reduce Summarization
3. Insights: Key Points, Themes, Action Items, Notable Facts
"""

import hashlib
import os
from file_parser import parse_file
from chunking import create_chunks_from_pages
from vector_store import VectorStore
from agents.summarizer import generate_summaries
from agents.insights import generate_insights

_store = VectorStore()

def generate_doc_id(file_path: str) -> str:
    """Generates a unique document ID based on filename and size."""
    filename = os.path.basename(file_path)
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    raw_key = f"{filename}_{file_size}".encode("utf-8")
    return hashlib.md5(raw_key).hexdigest()[:12]

async def run_ingestion_pipeline(file_path: str, doc_id: str = None, original_filename: str = None, user_id: str = "default_user") -> dict:
    """
    Executes full ingestion pipeline sequentially with user isolation:
    1. Parse and chunk file -> store in ChromaDB for user_id
    2. Run Map-Reduce Summarizer
    3. Run Insights Agent using partial batch summaries

    Returns unified session result dictionary.
    """
    if not doc_id:
        doc_id = generate_doc_id(file_path)

    display_name = original_filename if original_filename else os.path.basename(file_path)

    print(f"=== [PIPELINE STEP 1/3: EXTRACTOR & CHROMADB INDEXING] ===")
    print(f"Target File: '{display_name}' | Doc ID: '{doc_id}' | User ID: '{user_id}'")
    pages = parse_file(file_path)
    chunks = create_chunks_from_pages(pages)
    stored_count = _store.add_chunks(doc_id, chunks, user_id=user_id)
    print(f"Extractor complete. {len(pages)} pages parsed -> {stored_count} chunks indexed in ChromaDB.")

    print(f"\n=== [PIPELINE STEP 2/3: MAP-REDUCE SUMMARIZER AGENT] ===")
    summary_data = await generate_summaries(doc_id, user_id=user_id)
    print(f"Summarizer complete. Generated concise and detailed summaries.")

    print(f"\n=== [PIPELINE STEP 3/3: INSIGHTS AGENT] ===")
    insights_data = await generate_insights(summary_data["partial_summaries"])
    print(f"Insights complete. Extracted key points, themes, action items, and facts.")

    pipeline_result = {
        "doc_id": doc_id,
        "user_id": user_id,
        "file_name": display_name,
        "chunk_count": stored_count,
        "page_count": len(pages),
        "concise_summary": summary_data["concise_summary"],
        "detailed_summary": summary_data["detailed_summary"],
        "partial_summaries": summary_data["partial_summaries"],
        "insights": insights_data
    }

    return pipeline_result
