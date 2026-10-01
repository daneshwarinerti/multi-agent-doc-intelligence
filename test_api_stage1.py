"""
test_api_stage1.py
-------------------
Verification script for React Migration Stage 1 (POST /api/upload endpoint).
Tests uploading a file to FastAPI backend and receiving the JSON response.
"""

import os
from fastapi.testclient import TestClient
from api import app, STORED_RESULTS

def run_test():
    client = TestClient(app)

    # 1. Test Root Health Endpoint
    root_res = client.get("/")
    print("=== [TEST 1: GET / (HEALTH CHECK)] ===")
    print(f"Status Code: {root_res.status_code}")
    print(f"JSON Response: {root_res.json()}\n")

    # 2. Test File Upload Endpoint POST /api/upload
    os.makedirs("./scratch_test", exist_ok=True)
    sample_file_path = "./scratch_test/api_sample.txt"
    with open(sample_file_path, "w", encoding="utf-8") as f:
        f.write(
            "FinTech Solutions Inc. 2023 Q4 Summary\n\n"
            "Page 1: Overview\n"
            "FinTech Solutions reported quarterly revenue of $420 million, representing a 22% YoY growth. "
            "Digital Payments processing volume reached $12 billion across 45 million active accounts."
        )

    print("=== [TEST 2: POST /api/upload (FILE INGESTION ENDPOINT)] ===")
    with open(sample_file_path, "rb") as f:
        response = client.post(
            "/api/upload",
            files={"file": ("api_sample.txt", f, "text/plain")}
        )

    print(f"HTTP Response Code: {response.status_code}")
    print("Returned JSON Data:")
    print(response.json())

    # Verify cached result in backend
    doc_id = response.json().get("doc_id")
    print(f"\nCached in Backend STORED_RESULTS[{doc_id}]: {doc_id in STORED_RESULTS}")

if __name__ == "__main__":
    run_test()
