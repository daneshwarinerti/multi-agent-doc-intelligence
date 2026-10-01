"""
test_chunking.py
----------------
Verification script for Phase 2, Stage 1 (chunking.py).
Tests raw page cleaning and overlapping chunking on multi-page sample text.
"""

from chunking import clean_text, create_chunks_from_pages

def run_test():
    # Concrete sample data mimicking multi-page PDF output with hyphens and linebreaks
    sample_pages = [
        {
            "page_num": 1,
            "text": "The Multi-Agent Document Intelli-\ngence System processes large enterprise reports efficiently.   \n\n"
                    "It breaks documents down into manageable text blocks, preserving page metadata and "
                    "ensuring high-quality context for RAG operations."
        },
        {
            "page_num": 2,
            "text": "In Stage 2, vector embeddings are stored in ChromaDB to enable rapid seman-\ntic search. "
                    "Overlap of 150 characters prevents boundary information loss between chunks. "
                    "This ensures the Q&A agent can answer complex questions accurately."
        }
    ]

    print("--- [INPUT: RAW PAGE TEXT] ---")
    for p in sample_pages:
        print(f"Page {p['page_num']} ({len(p['text'])} chars):")
        print(f"  {repr(p['text'])}\n")

    # Run chunking with small chunk size (120 chars, 30 overlap) to demonstrate chunking behavior clearly
    chunks = create_chunks_from_pages(sample_pages, chunk_size=120, chunk_overlap=30)

    print("--- [OUTPUT: CLEANED & OVERLAPPING CHUNKS] ---")
    for c in chunks:
        print(f"ID: {c['chunk_id']} | Page: {c['page_num']} | Index: {c['chunk_index']} | Length: {len(c['text'])} chars")
        print(f"Text: \"{c['text']}\"\n")

if __name__ == "__main__":
    run_test()
