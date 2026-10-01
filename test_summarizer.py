"""
test_summarizer.py
-------------------
Verification script for Phase 4, Stage 1 (agents/summarizer.py).
Tests Map-Reduce summarization on multi-batch test document chunks stored in ChromaDB.
"""

import asyncio
from vector_store import VectorStore
from agents.summarizer import generate_summaries

async def run_test():
    store = VectorStore()
    doc_id = "annual_report_2023"

    # Store multi-batch sample chunks into ChromaDB
    sample_chunks = [
        {
            "chunk_id": "chunk_0",
            "text": "Executive Summary: In 2023, Global Logistics Inc. achieved total revenue of $8.4 billion, representing a 12% increase year-over-year. Operating income rose by 8% to $1.1 billion.",
            "page_num": 1,
            "chunk_index": 0
        },
        {
            "chunk_id": "chunk_1",
            "text": "Division Performance: The Freight Forwarding division saw robust growth due to increased trade volume in South East Asia. Maritime operations faced minor headwinds from fuel price volatility.",
            "page_num": 5,
            "chunk_index": 1
        },
        {
            "chunk_id": "chunk_2",
            "text": "Sustainability Initiatives: The company invested $120 million in fleet electrification and reduced fleet carbon emissions by 14% across urban delivery corridors.",
            "page_num": 12,
            "chunk_index": 2
        }
    ]

    store.add_chunks(doc_id, sample_chunks)

    print("=== EXECUTING MAP-REDUCE SUMMARIZER AGENT ===")
    results = await generate_summaries(doc_id=doc_id)

    print(f"\n--- [MAP STEP: PARTIAL SUMMARIES ({len(results['partial_summaries'])} BATCHES)] ---")
    for i, summary in enumerate(results['partial_summaries']):
        print(f"Batch {i+1} Partial Summary:\n{summary}\n")

    print("--- [REDUCE STEP: CONCISE EXECUTIVE SUMMARY] ---")
    print(f"{results['concise_summary']}\n")

    print("--- [REDUCE STEP: DETAILED SECTIONED SUMMARY] ---")
    print(f"{results['detailed_summary']}\n")

    # Clean up test collection
    store.delete_document(doc_id)

if __name__ == "__main__":
    asyncio.run(run_test())
