"""
test_api_stage2.py
-------------------
Verification script for React Migration Stage 2 (Summary & Insights Endpoints).
Tests GET /api/summary/{doc_id} and GET /api/insights/{doc_id} endpoints.
"""

import os
from fastapi.testclient import TestClient
from api import app

def run_test():
    client = TestClient(app)

    # 1. Upload sample document to populate backend cache
    os.makedirs("./scratch_test", exist_ok=True)
    sample_file_path = "./scratch_test/api_stage2_sample.txt"
    with open(sample_file_path, "w", encoding="utf-8") as f:
        f.write(
            "BioTech Labs 2023 Operations Report\n\n"
            "Page 1: Performance\n"
            "BioTech Labs completed Phase 3 clinical trials for Compound B2, demonstrating 88% efficacy. "
            "R&D spending totaled $140 million in 2023."
        )

    print("=== STEP 1: UPLOADING DOCUMENT VIA POST /api/upload ===")
    with open(sample_file_path, "rb") as f:
        upload_res = client.post(
            "/api/upload",
            files={"file": ("api_stage2_sample.txt", f, "text/plain")}
        )
    
    doc_id = upload_res.json()["doc_id"]
    print(f"Upload Complete! Doc ID: '{doc_id}'\n")

    # 2. Test GET /api/summary/{doc_id}
    print("=== STEP 2: TESTING GET /api/summary/{doc_id} ===")
    summary_res = client.get(f"/api/summary/{doc_id}")
    print(f"HTTP Status: {summary_res.status_code}")
    print("Concise Summary JSON Output:")
    print(f"  {summary_res.json()['concise_summary']}\n")

    # 3. Test GET /api/insights/{doc_id}
    print("=== STEP 3: TESTING GET /api/insights/{doc_id} ===")
    insights_res = client.get(f"/api/insights/{doc_id}")
    print(f"HTTP Status: {insights_res.status_code}")
    print("Key Points JSON Output:")
    for kp in insights_res.json()["insights"]["key_points"]:
        print(f"  • {kp}")

    # 4. Test Error Case (Non-existent Doc ID)
    print("\n=== STEP 4: TESTING ERROR CASE (404 FOR INVALID DOC ID) ===")
    invalid_res = client.get("/api/summary/invalid_doc_999")
    print(f"HTTP Status: {invalid_res.status_code}")
    print(f"JSON Detail: {invalid_res.json()}")

if __name__ == "__main__":
    run_test()
