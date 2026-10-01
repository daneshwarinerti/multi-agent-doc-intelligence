"""
test_qa_agent.py
----------------
Verification script for Phase 3 (Q&A Agent with search tool).
Tests grounded answering with page citations and out-of-document refusal.
"""

import asyncio
from vector_store import VectorStore
from agents.qa import ask_question

async def run_test():
    store = VectorStore()
    doc_id = "tech_report_99"

    # Pre-populate ChromaDB shared memory with test document chunks
    sample_chunks = [
        {
            "chunk_id": "chunk_0",
            "text": "In fiscal year 2023, Cloud Services revenue expanded by 34% to $1.2 billion, driven by enterprise AI adoption.",
            "page_num": 3,
            "chunk_index": 0
        },
        {
            "chunk_id": "chunk_1",
            "text": "The company hired 450 new machine learning engineers across North America and Europe to support R&D.",
            "page_num": 7,
            "chunk_index": 1
        }
    ]

    store.add_chunks(doc_id, sample_chunks)

    print("=== TEST 1: IN-DOCUMENT QUESTION (Expect grounded answer + page citation) ===")
    q1 = "What was the growth rate of Cloud Services revenue in 2023?"
    res1 = await ask_question(doc_id=doc_id, question=q1)
    
    print(f"Question: '{q1}'")
    print(f"Agent Answer:\n{res1['answer']}\n")
    print(f"Retrieved Sources Count: {len(res1['sources'])}")
    for s in res1['sources']:
        print(f"  Source Page {s['page_num']}: \"{s['text']}\"")

    print("\n" + "="*70 + "\n")

    print("=== TEST 2: OUT-OF-DOCUMENT QUESTION (Expect 'couldn't find it' refusal) ===")
    q2 = "What is the capital city of France?"
    res2 = await ask_question(doc_id=doc_id, question=q2)

    print(f"Question: '{q2}'")
    print(f"Agent Answer:\n{res2['answer']}\n")

    # Cleanup test collection
    store.delete_document(doc_id)

if __name__ == "__main__":
    asyncio.run(run_test())
