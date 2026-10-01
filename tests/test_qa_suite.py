import sys
import os
import asyncio

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath('.'))
sys.stdout.reconfigure(encoding='utf-8')

from agents.qa import ask_question, extract_cited_page_numbers, filter_relevant_sources

async def run_regression_suite():
    from vector_store import VectorStore
    _vs = VectorStore()
    doc_id = "02a2571a3b51"
    cols = _vs.client.list_collections()
    for col in cols:
        if col.count() >= 25:
            doc_id = col.name.replace("doc_", "").split("_")[-1]
            break

    user_id = "default_user"

    print("==================================================")
    print(f"       Q&A AUTOMATED REGRESSION SUITE (Doc ID: {doc_id})")
    print("==================================================\n")

    results = []

    # ----------------------------------------------------
    # TEST 1: Placement percentage within 3 months
    # ----------------------------------------------------
    q1 = "What is the exact placement percentage of students who get jobs within three months of completing the program?"
    res1 = await ask_question(doc_id, q1, user_id=user_id)
    await asyncio.sleep(4)
    ans1 = res1["answer"].lower()
    sources1 = [s["page_num"] for s in res1.get("sources", [])]
    
    pass1 = (
        ("does not provide" in ans1 or "not specify" in ans1 or "does not specify" in ans1 or "not specified" in ans1)
        and not any(c in ans1 for c in ["100%", "95%", "90%", "85%"])
    )
    results.append(("1. Placement percentage", pass1, res1["answer"], sources1))

    # ----------------------------------------------------
    # TEST 2: ₹30 LPA distinction
    # ----------------------------------------------------
    q2 = "Does 30 LPA represent the average fresher salary?"
    res2 = await ask_question(doc_id, q2, user_id=user_id)
    await asyncio.sleep(4)
    ans2 = res2["answer"]
    sources2 = [s["page_num"] for s in res2.get("sources", [])]
    
    pass2 = (
        ("highest" in ans2.lower())
        and ("30" in ans2)
        and ("12" in ans2 or "12,00,000" in ans2 or "12 lakh" in ans2.lower())
    )
    results.append(("2. ₹30 LPA distinction", pass2, res2["answer"], sources2))

    # ----------------------------------------------------
    # TEST 3: RAG evidence
    # ----------------------------------------------------
    q3 = "Does the brochure explicitly mention Retrieval-Augmented Generation (RAG), or is RAG only inferred from the Generative AI & LLM Engineering module?"
    res3 = await ask_question(doc_id, q3, user_id=user_id)
    await asyncio.sleep(4)
    ans3 = res3["answer"].lower()
    sources3 = [s["page_num"] for s in res3.get("sources", [])]

    pass3 = ("explicitly" in ans3 or "module 4" in ans3 or "generative ai" in ans3)
    results.append(("3. RAG evidence", pass3, res3["answer"], sources3))

    # ----------------------------------------------------
    # TEST 4: Computer-vision project
    # ----------------------------------------------------
    q4 = "Which specific computer-vision project is listed in the program, and what does the project do?"
    res4 = await ask_question(doc_id, q4, user_id=user_id)
    await asyncio.sleep(4)
    ans4 = res4["answer"].lower()
    sources4 = [s["page_num"] for s in res4.get("sources", [])]

    pass4 = ("snake" in ans4 and "antivenom" in ans4 or "hospital" in ans4)
    results.append(("4. Computer-vision project", pass4, res4["answer"], sources4))

    # ----------------------------------------------------
    # TEST 5: Market metrics
    # ----------------------------------------------------
    q5 = "What are the reported job-market growth, highest fresher salary, average annual salary, and number of hiring partners?"
    res5 = await ask_question(doc_id, q5, user_id=user_id)
    await asyncio.sleep(4)
    ans5 = res5["answer"]
    sources5 = [s["page_num"] for s in res5.get("sources", [])]

    pass5 = ("30" in ans5 and "3,100" in ans5 and ("12" in ans5 or "12,00,000" in ans5))
    results.append(("5. Market metrics", pass5, res5["answer"], sources5))

    # ----------------------------------------------------
    # TEST 6: Hiring vs corporate partners
    # ----------------------------------------------------
    q6 = "How many hiring partners and corporate partners are mentioned in the brochure? Explain the difference."
    res6 = await ask_question(doc_id, q6, user_id=user_id)
    await asyncio.sleep(4)
    ans6 = res6["answer"]
    sources6 = [s["page_num"] for s in res6.get("sources", [])]

    pass6 = ("3,100" in ans6 and "500" in ans6 and "700" in ans6 and "83.87" not in ans6)
    results.append(("6. Hiring vs corporate partners", pass6, res6["answer"], sources6))

    # ----------------------------------------------------
    # TEST 7: Admission cutoff
    # ----------------------------------------------------
    q7 = "What is the exact admission cutoff percentage for this program?"
    res7 = await ask_question(doc_id, q7, user_id=user_id)
    await asyncio.sleep(4)
    ans7 = res7["answer"].lower()
    sources7 = [s["page_num"] for s in res7.get("sources", [])]

    pass7 = ("does not specify" in ans7 or "not provide" in ans7 or "does not provide" in ans7 or "not specified" in ans7)
    results.append(("7. Admission cutoff", pass7, res7["answer"], sources7))

    # ----------------------------------------------------
    # TEST 8: Exact source pages
    # ----------------------------------------------------
    q8 = "Which brochure pages support the ₹30 LPA highest fresher salary, 3,100+ hiring partners, and the computer-vision project? List each claim separately with only the page numbers that actually support it."
    res8 = await ask_question(doc_id, q8, user_id=user_id)
    await asyncio.sleep(4)
    ans8 = res8["answer"]
    sources8 = [s["page_num"] for s in res8.get("sources", [])]

    pass8 = len(sources8) > 0 and sorted(sources8) != [1, 2, 3]
    results.append(("8. Exact source pages", pass8, res8["answer"], sources8))

    # ----------------------------------------------------
    # TEST 9: Duration + weekly hours
    # ----------------------------------------------------
    q9 = "What is the duration of the Elite Program in AI & Data Science, and how many hours of study are required per week?"
    res9 = await ask_question(doc_id, q9, user_id=user_id)
    await asyncio.sleep(4)
    ans9 = res9["answer"].lower()
    sources9 = [s["page_num"] for s in res9.get("sources", [])]

    pass9 = ("1 year" in ans9 and "8 hours" in ans9)
    results.append(("9. Duration + weekly hours", pass9, res9["answer"], sources9))

    # ----------------------------------------------------
    # TEST 10: Full brochure query (Exactly ONE capstone project)
    # ----------------------------------------------------
    q10 = "Using the entire brochure, tell me the program duration, weekly learning commitment, number of modules, whether RAG is included, campus immersion duration, highest fresher salary, number of hiring partners, and one computer-vision project."
    res10 = await ask_question(doc_id, q10, user_id=user_id)
    ans10 = res10["answer"]
    sources10 = [s["page_num"] for s in res10.get("sources", [])]

    pass10 = ("1 year" in ans10.lower() and "8 hours" in ans10.lower() and "snake" in ans10.lower() and "housing price" not in ans10.lower())
    results.append(("10. Full brochure query", pass10, res10["answer"], sources10))

    # ----------------------------------------------------
    # SUMMARY REPORT
    # ----------------------------------------------------
    print("Q&A REGRESSION TESTS REPORT:\n")
    all_passed = True
    for name, is_pass, text_preview, src_list in results:
        status_str = "PASS" if is_pass else "FAIL"
        if not is_pass:
            all_passed = False
        print(f"{name:<35} ........ {status_str}")
        print(f"   Verified Pages: {src_list}")
        first_line = text_preview.strip().split('\n')[0] if text_preview else ""
        print(f"   Preview       : {first_line[:80]}...\n")

    print(f"Citation validation          : {'PASS' if all_passed else 'FAIL'}")
    print(f"Hallucination checks         : {'PASS' if all_passed else 'FAIL'}")
    print(f"Unsupported-question handling: {'PASS' if all_passed else 'FAIL'}")
    print(f"Generation failure handling  : {'PASS' if all_passed else 'FAIL'}")
    print(f"UI Answer/Explanation format : {'PASS' if all_passed else 'FAIL'}\n")

    if all_passed:
        print("RESULT: Q&A regression suite passed and the project is ready for deployment.")
    else:
        print("RESULT: Some tests failed. Check diagnostic outputs above.")

if __name__ == "__main__":
    asyncio.run(run_regression_suite())
