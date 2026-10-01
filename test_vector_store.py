"""
test_vector_store.py
--------------------
Verification script for Phase 2, Stage 3 (vector_store.py).
Tests ChromaDB storage, semantic similarity search, sequential retrieval, and collection cleanup.
"""

import shutil
import os
from vector_store import VectorStore

def run_test():
    test_db_dir = "./scratch_test/chroma_db_test"
    if os.path.exists(test_db_dir):
        shutil.rmtree(test_db_dir)

    store = VectorStore(db_dir=test_db_dir)
    doc_id = "report_2023_a1b2"

    sample_chunks = [
        {
            "chunk_id": "chunk_0",
            "text": "The company reported total revenue growth of 18.5% in fiscal year 2023, reaching $4.2 billion.",
            "page_num": 1,
            "chunk_index": 0
        },
        {
            "chunk_id": "chunk_1",
            "text": "Operational costs increased by 5% due to supply chain expansions in EMEA and APAC regions.",
            "page_num": 2,
            "chunk_index": 1
        },
        {
            "chunk_id": "chunk_2",
            "text": "The Q3 budget allocation for artificial intelligence research was approved at $500 million.",
            "page_num": 4,
            "chunk_index": 2
        }
    ]

    print("--- [TEST 1: ADD CHUNKS TO CHROMADB SHARED MEMORY] ---")
    added_count = store.add_chunks(doc_id, sample_chunks)
    print(f"Document ID: {doc_id} | Chunks Stored: {added_count}\n")

    print("--- [TEST 2: SEMANTIC SEARCH QUERY] ---")
    query = "How much did revenue grow in 2023?"
    search_results = store.search_chunks(doc_id, query, top_k=2)
    print(f"Query: '{query}'")
    print(f"Top {len(search_results)} Retrieved Chunks:")
    for idx, r in enumerate(search_results):
        print(f"  Result {idx+1}: Page {r['page_num']} | Distance: {r['distance']}")
        print(f"  Excerpt: \"{r['text']}\"\n")

    print("--- [TEST 3: GET ALL CHUNKS IN SEQUENTIAL ORDER] ---")
    all_chunks = store.get_all_chunks(doc_id)
    print(f"Total Sequential Chunks Retrieved: {len(all_chunks)}")
    for c in all_chunks:
        print(f"  Index {c['chunk_index']} | Page {c['page_num']} | Text: \"{c['text'][:60]}...\"")

    print("\n--- [TEST 4: DELETE DOCUMENT COLLECTION] ---")
    deleted = store.delete_document(doc_id)
    print(f"Collection for '{doc_id}' deleted successfully: {deleted}")

if __name__ == "__main__":
    run_test()
