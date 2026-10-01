"""
test_pipeline.py
----------------
Verification script for Phase 5, Stage 1 (agents/pipeline.py).
Executes the full sequential ingestion pipeline on a test file.
"""

import asyncio
import os
from agents.pipeline import run_ingestion_pipeline
from vector_store import VectorStore

async def run_test():
    os.makedirs("./scratch_test", exist_ok=True)
    sample_file = "./scratch_test/pipeline_sample.txt"

    with open(sample_file, "w", encoding="utf-8") as f:
        f.write(
            "Acme Health Systems 2023 Annual Report\n\n"
            "Section 1: Financial Performance\n"
            "Acme Health Systems recorded annual revenue of $3.5 billion in 2023, up 15% from $3.0 billion in 2022. "
            "Net operating income reached $450 million. The Telehealth division grew by 42% due to patient expansion.\n\n"
            "Section 2: Strategic Initiatives\n"
            "Management authorized a $80 million capital deployment for hospital infrastructure modernization. "
            "Key focus areas include automated EHR patient records and AI diagnostic assistance.\n\n"
            "Section 3: Risk & Compliance\n"
            "HIPAA compliance audit was completed with zero major findings. Data encryption was upgraded across 100% of data centers."
        )

    print("=== EXECUTING SEQUENTIAL INGESTION PIPELINE ===")
    result = await run_ingestion_pipeline(sample_file)

    print("\n--- [PIPELINE OUTPUT SUMMARY] ---")
    print(f"Document ID: {result['doc_id']}")
    print(f"Page Count: {result['page_count']} | Chunk Count: {result['chunk_count']}")

    print("\n--- [CONCISE SUMMARY] ---")
    print(result['concise_summary'])

    print("\n--- [INSIGHTS KEY POINTS] ---")
    for kp in result['insights']['key_points']:
        print(f"  • {kp}")

    # Cleanup
    store = VectorStore()
    store.delete_document(result['doc_id'])

if __name__ == "__main__":
    asyncio.run(run_test())
