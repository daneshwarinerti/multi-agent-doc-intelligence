"""
test_api_stage3.py
-------------------
Verification script for React Migration Stage 3 (POST /api/ask endpoint).
Tests grounded Q&A with page citations and out-of-document refusal over HTTP.
"""

import os
from fastapi.testclient import TestClient
from api import app

def run_test():
    client = TestClient(app)

    # 1. Upload sample document to populate ChromaDB
    os.makedirs("./scratch_test", exist_ok=True)
    sample_file_path = "./scratch_test/api_stage3_sample.txt"
    with open(sample_file_path, "w", encoding="utf-8") as f:
        f.write(
            "PharmaCorp 2023 Clinical Summary\n\n"
            "Page 2: Trial Results\n"
            "Compound B2 achieved 88% overall efficacy in Phase 3 trials with zero severe adverse events reported. "
            "FDA submission is scheduled for Q2 2024."
        )

    print("=== STEP 1: UPLOADING DOCUMENT VIA POST /api/upload ===")
    with open(sample_file_path, "rb") as f:
        upload_res = client.post(
            "/api/upload",
            files={"file": ("api_stage3_sample.txt", f, "text/plain")}
        )

    doc_id = upload_res.json()["doc_id"]
    print(f"Upload Complete! Doc ID: '{doc_id}'\n")

    # 2. Test In-Document Question via POST /api/ask
    print("=== STEP 2: TESTING IN-DOCUMENT QUESTION VIA POST /api/ask ===")
    q1 = "What was the efficacy rate of Compound B2?"
    res1 = client.post(
        "/api/ask",
        json={"doc_id": doc_id, "question": q1}
    )

    print(f"HTTP Status: {res1.status_code}")
    print(f"Question: '{q1}'")
    print(f"Answer: {res1.json()['answer']}")
    print(f"Retrieved Sources Count: {len(res1.json()['sources'])}")
    for src in res1.json()["sources"]:
        print(f"  Source Page {src['page_num']}: \"{src['text']}\"")

    print("\n" + "="*70 + "\n")

    # 3. Test Out-Of-Document Question via POST /api/ask
    print("=== STEP 3: TESTING OUT-OF-DOCUMENT QUESTION VIA POST /api/ask ===")
    q2 = "What is the capital of Japan?"
    res2 = client.post(
        "/api/ask",
        json={"doc_id": doc_id, "question": q2}
    )

    print(f"HTTP Status: {res2.status_code}")
    print(f"Question: '{q2}'")
    print(f"Answer: {res2.json()['answer']}")

if __name__ == "__main__":
    run_test()
