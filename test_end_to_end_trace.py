"""
test_end_to_end_trace.py
------------------------
Full End-to-End Narrated Trace script for the Document Intelligence System.
Traces a real sample document from upload to ingestion completion, and a real question to grounded answer.
"""

import asyncio
import os
from agents.pipeline import run_ingestion_pipeline, generate_doc_id
from agents.qa import ask_question
from vector_store import VectorStore

async def run_end_to_end_trace():
    os.makedirs("./scratch_test", exist_ok=True)
    sample_file = "./scratch_test/annual_report_2023_trace.txt"

    # 1. Create a real sample document text
    with open(sample_file, "w", encoding="utf-8") as f:
        f.write(
            "Global Financial Report 2023 - Acme Corporation\n\n"
            "Page 1: Executive Overview\n"
            "Acme Corporation recorded total annual revenue of $5.2 billion in 2023, reflecting a 14% year-over-year expansion. "
            "Net operating income reached $620 million, driven by strong adoption in the Cloud Enterprise division.\n\n"
            "Page 2: Regional Performance & Risks\n"
            "North America contributed $3.1 billion, while EMEA generated $1.4 billion. "
            "Supply chain delays in Asia-Pacific created $45 million in temporary logistics cost inflation.\n\n"
            "Page 3: Future Outlook & Investments\n"
            "The board approved $150 million for R&D in generative AI and automated supply chain routing. "
            "Acme aims for a 15% reduction in operational carbon footprint by 2025."
        )

    print("==================================================================================")
    print("                    END-TO-END SYSTEM TRACE: INGESTION FLOW                       ")
    print("==================================================================================")
    print(f"STEP 1: User uploads file '{os.path.basename(sample_file)}' ({os.path.getsize(sample_file)} bytes)")
    
    doc_id = generate_doc_id(sample_file)
    print(f"STEP 2: System generates unique Document ID: '{doc_id}'")
    
    print("\nSTEP 3: Executing Sequential Ingestion Pipeline (run_ingestion_pipeline)...")
    ingestion_output = await run_ingestion_pipeline(sample_file, doc_id=doc_id)

    print("\n----------------------------------------------------------------------------------")
    print("                       INGESTION CROSS-BOUNDARY DATA SUMMARY                      ")
    print("----------------------------------------------------------------------------------")
    print(f"• Document ID: {ingestion_output['doc_id']}")
    print(f"• File Name: {ingestion_output['file_name']}")
    print(f"• Parsed Pages: {ingestion_output['page_count']} page(s)")
    print(f"• ChromaDB Chunks Indexed: {ingestion_output['chunk_count']} chunk(s)")
    print(f"\n[UI DISPLAY - TAB 1: CONCISE SUMMARY]\n{ingestion_output['concise_summary']}")
    print(f"\n[UI DISPLAY - TAB 2: INSIGHTS KEY POINTS]\n" + "\n".join([f"  • {kp}" for kp in ingestion_output['insights']['key_points']]))

    print("\n==================================================================================")
    print("                      END-TO-END SYSTEM TRACE: Q&A CHAT FLOW                      ")
    print("==================================================================================")
    user_question = "What was the annual revenue of Acme Corporation in 2023?"
    print(f"STEP 1: User types question into UI Tab 3: '{user_question}'")

    print("\nSTEP 2: Q&A Agent executes search_document tool against ChromaDB...")
    qa_result = await ask_question(doc_id=doc_id, question=user_question)

    print("\n----------------------------------------------------------------------------------")
    print("                        Q&A CROSS-BOUNDARY DATA SUMMARY                           ")
    print("----------------------------------------------------------------------------------")
    print("• Retrieved ChromaDB Excerpts:")
    for src in qa_result["sources"]:
        print(f"  - Page {src['page_num']} (Distance: {src['distance']}): \"{src['text'][:100]}...\"")

    print(f"\n[UI DISPLAY - TAB 3: GROUNDED CHAT RESPONSE]\n{qa_result['answer']}")

    # Cleanup
    store = VectorStore()
    store.delete_document(doc_id)

if __name__ == "__main__":
    asyncio.run(run_end_to_end_trace())
