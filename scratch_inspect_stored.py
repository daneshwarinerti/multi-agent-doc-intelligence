# scratch_inspect_stored.py
import json

with open("stored_results.json", "r", encoding="utf-8") as f:
    results = json.load(f)

print("Keys in stored_results:", list(results.keys()))

for doc_id, data in results.items():
    print(f"\n================ DOC_ID: {doc_id} ================")
    summary = data.get("summary", {})
    concise = summary.get("concise_summary", "")
    detailed = summary.get("detailed_summary", "")
    
    print("--- CONCISE SUMMARY RAW ---")
    print(concise)
    
    print("\n--- DETAILED SUMMARY RAW ---")
    print(detailed)
