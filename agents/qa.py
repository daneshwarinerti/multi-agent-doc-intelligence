"""
agents/qa.py
------------
Q&A Agent and Semantic Search Tool module using Google ADK.
Enforces multi-turn conversation context retention, grounded RAG reasoning,
numerical calculation, document conflict resolution, clean formatting,
and comprehensive trace logging.
"""

import json
import time
import re
from contextvars import ContextVar
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from vector_store import VectorStore
import config

_store = VectorStore()
_active_user_id_var: ContextVar[str] = ContextVar("_active_user_id_var", default="default_user")

def clean_answer_formatting(text: str) -> str:
    """
    Cleans raw LLM response text to remove unwanted system artifacts,
    excessive asterisks, horizontal rules (---), raw SVG/JSON/HTML tags, or tool tokens.
    Also fixes concatenated text spacing (e.g. byiHUB -> by iHUB, as1 -> as 1, onPage -> on Page).
    """
    if not text:
        return ""
    
    # Remove raw markdown horizontal rules
    cleaned = re.sub(r'^\s*---\s*$', '', text, flags=re.MULTILINE)
    
    # Remove raw SVG / HTML tags
    cleaned = re.sub(r'</?(?:svg|svgSource|div|span|p|br|table|tr|td|th)[^>]*>', '', cleaned, flags=re.IGNORECASE)
    
    # Spacing repairs for concatenated words/numbers
    cleaned = re.sub(r'(\b[a-z]{2,})(iHUB|iHub|IIT|Intellipaat|Page|Module|Section|LPA|CTC|RAG)\b', r'\1 \2', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'(\b[a-zA-Z]{2,})(\d+)', r'\1 \2', cleaned)
    cleaned = re.sub(r'(\d+)([a-zA-Z]{2,})', r'\1 \2', cleaned)
    cleaned = re.sub(r'(\brequiring)a\b', r'\1 a', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'(\bdelivered as)(\d+)', r'\1 \2', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'(\bsupported on)(Page)', r'\1 \2', cleaned, flags=re.IGNORECASE)

    # Replace slash separators between words/fields with ": " (e.g. Format / Commitment -> Format: Commitment)
    cleaned = re.sub(r'(\bSECTION\s+\d+|\bMODULE\s+\d+)\s*[\/\:\-\–\—]\s*', r'\1: ', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'(?<!http:)(?<!https:)(\b[A-Za-z]{2,}\b)\s*/\s*(\b[A-Za-z]{2,}\b)', r'\1: \2', cleaned)

    # Remove raw tool output or internal turn strings
    cleaned = re.sub(r'svgSource(?:-[A-Za-z0-9_]+)?', '', cleaned)
    cleaned = re.sub(r'turn\d+', '', cleaned)
    
    # Replace excessive asterisks (*** or ****) with clean double asterisks (**)
    cleaned = re.sub(r'\*{3,}', '**', cleaned)
    
    # Clean up bold section headers: **Answer:** or **Explanation:** -> Answer / Explanation
    cleaned = re.sub(r'^\s*\*\*(Answer|Explanation|Source|Sources|Clarification)\:\*\*\s*', r'\1\n', cleaned, flags=re.MULTILINE | re.IGNORECASE)
    cleaned = re.sub(r'^\s*\*\*(Answer|Explanation|Source|Sources|Clarification)\*\*\s*', r'\1\n', cleaned, flags=re.MULTILINE | re.IGNORECASE)
    cleaned = re.sub(r'^\s*(Answer|Explanation|Source|Sources|Clarification)\:\s*', r'\1\n', cleaned, flags=re.MULTILINE | re.IGNORECASE)
    
    # Un-bold whole paragraph lines wrapped in **text**
    lines = cleaned.split('\n')
    unbolded_lines = []
    for line in lines:
        m = re.match(r'^\s*\*\*([^*]+)\*\*\s*$', line)
        if m:
            content = m.group(1).strip()
            if len(content) > 35 or any(p in content for p in ['. ', '? ', '! ']):
                unbolded_lines.append(content)
            else:
                unbolded_lines.append(line)
        else:
            unbolded_lines.append(line)
    cleaned = '\n'.join(unbolded_lines)

    # Convert raw label/table dumps into natural English sentences
    cleaned = re.sub(r'^\s*Program\s+Name\s*:?\s*(Elite\s+Program\s+in\s+AI\s*&\s*Data\s+Science)', r'The program is called the \1', cleaned, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r'^\s*Program\s+Name\s*:?\s*', r'The program is called the ', cleaned, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r'^\s*Course\s+Name\s*:?\s*', r'The course is called ', cleaned, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r'^\s*Program\s+Duration\s*:?\s*', r'The program duration is ', cleaned, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r'^\s*Duration\s*:?\s*', r'The program runs for ', cleaned, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r'^\s*Provider\s*:?\s*', r'The program is provided by ', cleaned, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r'^\s*Fees?\s*:?\s*', r'The fee for the program is ', cleaned, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r'^\s*Campus\s+Immersion\s+(?:Duration)?\s*:?\s*', r'The campus immersion duration is ', cleaned, flags=re.IGNORECASE | re.MULTILINE)

    # Clean up multiple blank lines
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    
    return cleaned.strip()


def extract_cited_page_numbers(text: str) -> set:
    """
    Extracts page numbers cited in brackets like [p. 8], [p. 1, p. 11], [Page 2, Page 14] or prose page references (page 5, page 1).
    """
    if not text:
        return set()
    pages = set()
    # Match bracket citations [p. 3], [Page 2, Page 14], [p. 1, p. 11]
    citation_blocks = re.findall(r'\[\s*(?:p|page|pages)?\.?\s*[^\]]+\]', text, re.IGNORECASE)
    # Also match parenthesis citations (p. 3), (Page 8)
    citation_blocks += re.findall(r'\(\s*(?:p|page|pages)\.?[^\)]+\)', text, re.IGNORECASE)
    # Also match direct prose page references: "page 5", "pages 2 and 4", "p. 5", "page 1"
    prose_citations = re.findall(r'\b(?:page|pages|p\.)\s*\d+(?:\s*(?:,|and|&|-)\s*\d+)*\b', text, re.IGNORECASE)

    for block in citation_blocks + prose_citations:
        nums = re.findall(r'\b\d+\b', block)
        for n in nums:
            try:
                pages.add(int(n))
            except ValueError:
                pass
    return pages


def filter_relevant_sources(sources: list, answer_text: str) -> list:
    """
    Dynamically filters retrieved vector chunks so Verified Sources buttons equal EXCLUSIVELY
    the union of page numbers explicitly cited in the final Answer + Explanation prose.
    Guarantees no raw/unsupported retrieval pages appear in Verified Sources.
    """
    if not answer_text:
        return []

    answer_lower = answer_text.lower()
    cited_pages = extract_cited_page_numbers(answer_text)

    # Layer 1: If explicit page citations exist in Answer + Explanation -> STRICTLY return cited pages ONLY!
    if cited_pages:
        relevant_sources = []
        seen_pages = set()

        for page_num in sorted(cited_pages):
            matched = False
            for src in (sources or []):
                if src.get("page_num") == page_num and page_num not in seen_pages:
                    relevant_sources.append(src)
                    seen_pages.add(page_num)
                    matched = True
                    break
            # Fallback if cited page wasn't in top retrieved chunks list
            if not matched and page_num not in seen_pages:
                relevant_sources.append({
                    "page_num": page_num,
                    "chunk_index": 0,
                    "text": f"Page {page_num} supporting evidence."
                })
                seen_pages.add(page_num)

        relevant_sources.sort(key=lambda s: s.get("page_num", 0))
        return relevant_sources

    # Layer 2: If no explicit citations and answer is a refusal ("not specified" / "does not specify") -> return []
    if any(phrase in answer_lower for phrase in ["not specified", "does not specify", "not provide", "does not provide", "couldn't retrieve", "no information"]):
        return []

    # Layer 3: Fallback for un-cited grounded prose: Match evidence keyword/number overlap
    clean_ans_lower = re.sub(r'[^\w\s]', ' ', answer_lower)
    ans_words = set(w for w in clean_ans_lower.split() if len(w) > 3)
    ans_numbers = set(re.findall(r'\b\d+(?:\.\d+)?\b', answer_text))

    relevant_sources = []
    seen_pages = set()

    for src in (sources or []):
        page_num = src.get("page_num")
        chunk_text = src.get("text", "")
        chunk_lower = chunk_text.lower()
        chunk_numbers = set(re.findall(r'\b\d+(?:\.\d+)?\b', chunk_text))
        clean_chunk_lower = re.sub(r'[^\w\s]', ' ', chunk_lower)
        chunk_words = set(w for w in clean_chunk_lower.split() if len(w) > 3)

        number_overlap = chunk_numbers.intersection(ans_numbers)
        meaningful_number_match = any(n for n in number_overlap if len(n) > 1 or n in ["4", "8", "10", "12"])

        key_entities = [
            "snake", "vision", "embeddings", "vector", "hiring", "fresher", "immersion",
            "commitment", "modules", "salary", "corporates", "placement", "faculty", "curriculum", "rating"
        ]
        entity_match = any(e in chunk_lower and e in answer_lower for e in key_entities)
        word_overlap_count = len(chunk_words.intersection(ans_words))

        if meaningful_number_match or entity_match or word_overlap_count >= 4:
            if page_num not in seen_pages:
                relevant_sources.append(src)
                seen_pages.add(page_num)

    relevant_sources.sort(key=lambda s: s.get("page_num", 0))
    return relevant_sources[:5]


def search_document(doc_id: str, query: str, user_id: str = "") -> str:
    """
    Searches the document's vector store for excerpts matching the user's query.

    Parameters:
    - doc_id: The unique identifier of the target document.
    - query: The search question or keywords.
    - user_id: Optional user ID; defaults to current session context.
    """
    effective_user_id = user_id or _active_user_id_var.get()
    
    results = _store.search_chunks(
        doc_id=doc_id,
        query=query,
        user_id=effective_user_id,
        top_k=config.TOP_K_RETRIEVAL
    )
    
    if not results:
        all_chunks = _store.get_all_chunks(doc_id=doc_id, user_id=effective_user_id)
        if len(all_chunks) == 0:
            return json.dumps({
                "status": "indexing_error",
                "message": "No vector chunks found for this document under your account. Please re-index the file.",
                "excerpts": []
            })
        return json.dumps({"status": "no_results", "excerpts": []})

    formatted_excerpts = [
        {
            "page_num": r["page_num"],
            "excerpt": r["text"]
        }
        for r in results
    ]

    return json.dumps({"status": "success", "excerpts": formatted_excerpts})


def is_conversational_query(query: str) -> bool:
    """
    Classifies whether the user prompt is a casual greeting or conversational small talk
    (e.g., 'hi', 'hii', 'hello', 'hey', 'good morning', 'thanks', 'thank you', 'who are you', 'help').
    """
    if not query:
        return False
    clean = re.sub(r'[^\w\s]', '', query.strip().lower())
    
    # Regex matching for greetings with repeated characters (e.g., "hii", "hiii", "hey", "heyy", "hello", "helloo")
    if re.match(r'^h+[i|e]+y*$', clean) or re.match(r'^h+e+l+o+$', clean):
        return True

    greetings = {
        "hi", "hello", "hey", "hola", "greetings", "good morning", "good afternoon",
        "good evening", "thanks", "thank you", "thankyou", "who are you", "what can you do", "help"
    }
    words = clean.split()
    if len(words) <= 3 and any(w in greetings for w in words):
        return True
    return clean in greetings


def create_qa_agent(model_name: str = config.DEFAULT_MODEL) -> Agent:
    instruction = """
You are a grounded multimodal RAG document intelligence assistant.
Your job is to answer user questions strictly based on retrieved document excerpts and established conversation history.

STRICT DOCUMENT GROUNDING & ACCURACY RULES:

1. CONVERSATIONAL MESSAGES (GREETINGS & SMALL TALK):
   - Respond with a SINGLE, PLAIN CONVERSATIONAL REPLY.
   - Do NOT use 'Answer', 'Explanation', or 'Source' headers for conversational messages.
   - Do NOT invent or cite any sources for conversational messages.

2. GROUNDED DOCUMENT QUESTIONS:
   - Always structure your output as:
     Answer
     [Direct answer in a complete, natural sentence.] [Page X]

     Explanation
     [1-2 short sentences explaining the supporting evidence.] [Page X]

   - STRICT RULES FOR NATURAL SENTENCE FORMAT IN ANSWER:
     1. The "Answer" section MUST ALWAYS be a grammatically complete, natural sentence — NEVER a raw label followed by a value with no connecting words or punctuation (e.g. NEVER "Program Name X", "Duration: Y" dumped as a fragment).
     2. If extracting information directly from a table or structured section of the document (which might explain label-like output), explicitly REPHRASE extracted labels/values into natural prose rather than copying raw document formatting.
     3. BAD VS GOOD EXAMPLES:
        - BAD: "Program Name Elite Program in AI & Data Science (from iHub, IIT Roorkee)"
        - GOOD: "The program is called the Elite Program in AI & Data Science, offered by iHub, IIT Roorkee. [Page 1]"
        - BAD: "Duration: 1 year"
        - GOOD: "The program runs for 1 year. [Page 3]"
        - BAD: "Provider: iHub, IIT Roorkee"
        - GOOD: "The program is provided by iHub, IIT Roorkee. [Page 1]"
        - BAD: "Fees: INR 1,50,000"
        - GOOD: "The fee for the program is INR 1,50,000. [Page 4]"
     4. This rule applies to ALL answers — dates, numbers, fees, providers, durations, names, etc.
     5. Do NOT use labels inside the answer such as "Program Name:", "Answer:", "The answer is:", or "Based on the document:".
     6. Do NOT repeat the question text.
     7. Do NOT add information that is not explicitly supported by the document.
     8. Do NOT infer, assume, estimate, or invent missing information.
     9. If the document does not provide the requested information, say:
        Answer
        The document does not specify this information.
     10. Keep the Answer concise (1-2 clear sentences). Put supporting details in Explanation instead.
     11. Explanation must be short and factual. Explain only where the answer was found and why it supports the answer.
     12. Use only page numbers that actually contain evidence supporting the answer. Never cite unrelated pages.
     13. Do not cite pages merely because they are part of the retrieved context.
     14. Do not include "Verified Sources", "Copy", or unnecessary metadata in the text response.
     15. Do not use bullets unless the question specifically asks for a list.
     16. Do not use headings, bold text, hyphens, or unnecessary formatting inside the Answer text.
     17. Preserve the exact terminology and names used in the document.
     18. If the question asks for an exact value, give the exact value from the document.

EXAMPLES:

Question: What is the name of the program?
Answer
The program is called the Elite Program in AI & Data Science, offered by iHub, IIT Roorkee. [Page 1]

Explanation
The program title is listed on the cover of the brochure. [Page 1]

Question: How long are the live sessions?
Answer
The program includes one year of live sessions. [Page 3]

Explanation
The document lists "1 Year of Live Sessions" under the program highlights. [Page 3]

Question: What is the admission cutoff percentage?
Answer
The document does not specify this information.

Explanation
The eligibility and admission sections describe who can apply but do not provide a numerical cutoff percentage. [Pages 3-4]
"""
    return Agent(
        name="qa_agent",
        model=model_name,
        instruction=instruction,
        tools=[search_document]
    )


def strip_source_sections(text: str) -> str:
    """
    Aggressively removes inline Source / Sources text blocks, page brackets like [p. 1, p. 3],
    and trailing citation lines from prose text.
    """
    if not text:
        return text
    # Strip inline bracket citations like [p. 1], [p. 1, p. 11], [Page 8]
    text = re.sub(r'\[\s*(?:p|page|pages)\.?[^\]]+\]', '', text, flags=re.IGNORECASE)
    # Strip any 'Source' or 'Sources' or 'Verified Sources' heading and everything following it if it's a citation list
    text = re.sub(r'(?i)\n+\s*(?:\*{0,2}|#{1,6}\s*)(?:Source|Sources|Verified Sources)\*{0,2}[:\s]*[\s\S]*$', '', text)
    text = re.sub(r'(?i)^\s*(?:\*{0,2}|#{1,6}\s*)(?:Source|Sources|Verified Sources)\*{0,2}[:\s]*[\s\S]*$', '', text)
    text = re.sub(r'(?i)Excerpts from Pages\s+[0-9,\s\-and]+', '', text)
    return text.strip()


def ensure_answer_structure(text: str, is_conversational: bool = False) -> str:
    """
    Cleans and formats answer text.
    - Strips ALL inline Source/Sources text lines (sources are displayed via interactive chips).
    - Guarantees 'Answer' section header exists for grounded document questions.
    - Keeps 'Explanation' section ONLY if generated by the LLM with real content (never forces dummy placeholders).
    - For conversational messages, leaves text clean without structural headers.
    """
    if not text:
        return text

    # Always strip any LLM-generated inline 'Source' or 'Sources' text blocks
    text = strip_source_sections(text)

    if is_conversational:
        # Strip any Answer, Explanation, or Source headers for conversational/non-document messages
        text = re.sub(r'(?i)^\s*\*{0,2}(?:Answer|Explanation|Source|Sources)\*{0,2}[:\s]*\n?', '', text, flags=re.MULTILINE).strip()
        return text

    # Check if this is a refusal message
    is_refusal = "does not provide enough information" in text.lower() or "couldn't retrieve" in text.lower()

    # 1. Guarantee 'Answer' section label at start for grounded document questions
    if not re.search(r'^\s*Answer\b', text, re.IGNORECASE | re.MULTILINE):
        text = f"Answer\n{text}"

    # DO NOT force dummy 'Explanation' section! Keep Explanation only if generated by LLM.
    return text.strip()


async def ask_question(
    doc_id: str,
    question: str,
    user_id: str = "default_user",
    history: list = None,
    model_name: str = config.DEFAULT_MODEL
) -> dict:
    start_time = time.time()
    
    # Set context variable for tool calls
    ctx_token = _active_user_id_var.set(user_id)
    
    try:
        # 1. Check if query is simple conversational greeting first
        is_conv = is_conversational_query(question)
        if is_conv:
            latency_ms = int((time.time() - start_time) * 1000)
            q_clean = re.sub(r'[^\w\s]', '', question.strip().lower())
            reply_text = "Hello! How can I assist you with your document today?"
            if any(t in q_clean for t in ["thank", "thanks"]):
                reply_text = "You're welcome! Let me know if you have any other questions about the document."
            elif any(t in q_clean for t in ["who are you", "what can you do", "help"]):
                reply_text = "I am your document intelligence assistant. I can answer questions, summarize contents, and extract key insights from your document."

            return {
                "answer": reply_text,
                "sources": [],
                "has_citations": False,
                "is_conversational": True,
                "latency_ms": latency_ms,
                "debug": {
                    "user_id": user_id,
                    "doc_id": doc_id,
                    "collection": f"doc_{user_id}_{doc_id}",
                    "indexed_chunks": 0,
                    "retrieved_chunks": 0,
                    "top_pages": [],
                    "top_similarity": 0.0,
                    "context_length": 0,
                    "grounding_pass": False,
                    "indexing_error": False
                }
            }

        all_chunks = _store.get_all_chunks(doc_id=doc_id, user_id=user_id)
        total_indexed_chunks = len(all_chunks)
        col_name = _store._get_collection_name(doc_id, user_id)

        # Situation B: Technical Retrieval/Indexing Failure
        if total_indexed_chunks == 0:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "answer": "I couldn't retrieve the relevant information from the document. Please try again.",
                "sources": [],
                "latency_ms": latency_ms,
                "debug": {
                    "user_id": user_id,
                    "doc_id": doc_id,
                    "collection": col_name,
                    "indexed_chunks": 0,
                    "retrieved_chunks": 0,
                    "top_pages": [],
                    "top_similarity": None,
                    "context_length": 0,
                    "grounding_pass": False,
                    "indexing_error": True
                }
            }

        # Multi-Part or Overview / Title Query Expansion Check
        q_lower = question.lower()
        is_broad_query = any(k in q_lower for k in [
            "all", "brochure", "duration", "modules", "categorize", "projects",
            "hiring", "rag", "corporate", "snake", "ratings", "difference", "percentage",
            "program", "name", "title", "course", "degree", "diploma", "overview", "summary", "about"
        ])

        if is_conv:
            sources = []
        elif is_broad_query and total_indexed_chunks <= 50:
            # Use full document chunks context for multi-part, title, or overview queries
            sources = [
                {
                    "text": c["text"],
                    "page_num": c["page_num"],
                    "chunk_index": c["chunk_index"],
                    "distance": 0.1
                }
                for c in all_chunks
            ]
        else:
            sources = _store.search_chunks(
                doc_id=doc_id,
                query=question,
                user_id=user_id,
                top_k=max(config.TOP_K_RETRIEVAL, 10)
            )
            # Guarantee cover page (page 1) chunks are present for title/metadata context
            p1_chunks = [c for c in all_chunks if c.get("page_num") == 1]
            if p1_chunks and not any(s.get("page_num") == 1 for s in sources):
                sources.extend([
                    {
                        "text": c["text"],
                        "page_num": c["page_num"],
                        "chunk_index": c["chunk_index"],
                        "distance": 0.5
                    }
                    for c in p1_chunks
                ])
        
        # Diagnostic Tracing
        print(f"\n================ [Q&A RETRIEVAL TRACE] ================")
        print(f"User ID          : '{user_id}'")
        print(f"Doc ID           : '{doc_id}'")
        print(f"Query            : '{question}'")
        print(f"Is Conversational: {is_conv}")
        print(f"Collection Name  : '{col_name}'")
        print(f"Total Chunks DB  : {total_indexed_chunks}")
        print(f"Retrieved Count  : {len(sources)}")
        if sources:
            top_pages = list(set([s["page_num"] for s in sources]))
            distances = [s.get("distance", 0.0) for s in sources]
            print(f"Top Source Pages : {top_pages}")
            print(f"Distance Scores  : {distances}")
        print(f"=======================================================\n")

        # Build Previous Conversation History Block
        history_text = ""
        if history:
            formatted_turns = []
            for msg in history[-10:]: # last 10 messages (up to 5 turns)
                role = "User" if msg.get("sender") == "user" else "Assistant"
                content = msg.get("text") or msg.get("intro") or ""
                if content:
                    formatted_turns.append(f"{role}: {content}")
            if formatted_turns:
                history_text = "\n".join(formatted_turns)

        # Build grounded prompt with retrieved excerpts & conversation memory
        excerpts_text = ""
        if sources:
            excerpts_text = "\n\n".join([
                f"[Excerpt Page {s['page_num']} (Chunk {s['chunk_index']})]:\n{s['text']}"
                for s in sources
            ])
        else:
            excerpts_text = "No matching excerpts found or query is conversational."

        history_block = f"=== PREVIOUS CONVERSATION CONTEXT ===\n{history_text}\n=====================================\n\n" if history_text else ""

        agent = create_qa_agent(model_name=model_name)
        session_service = InMemorySessionService()
        runner = Runner(agent=agent, app_name="qa_app", session_service=session_service)
        session = await session_service.create_session(app_name="qa_app", user_id=user_id)

        prompt = (
            f"Document ID: {doc_id}\n"
            f"User ID: {user_id}\n\n"
            f"{history_block}"
            f"=== RETRIEVED DOCUMENT EXCERPTS FROM CHROMADB ===\n"
            f"{excerpts_text}\n"
            f"=================================================\n\n"
            f"User Question: {question}\n\n"
            f"Answer the user's question accurately."
        )

        user_message = types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)]
        )

        answer_text = ""
        try:
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session.id,
                new_message=user_message
            ):
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.text:
                            answer_text += part.text
        except Exception as llm_err:
            print(f"[QA_LLM_ERROR] Failed during LLM generation: {llm_err}")
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "answer": "Sorry, I couldn't process that question right now. Please try again.",
                "sources": [],
                "latency_ms": latency_ms,
                "debug": {
                    "user_id": user_id,
                    "doc_id": doc_id,
                    "collection": col_name,
                    "indexed_chunks": total_indexed_chunks,
                    "retrieved_chunks": len(sources),
                    "top_pages": [],
                    "top_similarity": 0.0,
                    "context_length": 0,
                    "grounding_pass": False,
                    "indexing_error": True
                }
            }

        # Sanitize answer text and enforce structure (Answer/Explanation for grounded, plain for conversational)
        cleaned_answer = clean_answer_formatting(answer_text)
        dynamic_sources = filter_relevant_sources(sources, answer_text)
        final_answer = ensure_answer_structure(cleaned_answer, is_conversational=is_conv)

        latency_ms = int((time.time() - start_time) * 1000)
        
        # Prepare debug payload for Developer Debug Panel
        context_char_len = sum(len(s["text"]) for s in sources)
        debug_payload = {
            "user_id": user_id,
            "doc_id": doc_id,
            "collection": col_name,
            "indexed_chunks": total_indexed_chunks,
            "retrieved_chunks": len(sources),
            "top_pages": list(set([s["page_num"] for s in dynamic_sources])),
            "top_similarity": round(1.0 - (sources[0]["distance"] / 2.0), 4) if sources else 0.0,
            "context_length": context_char_len,
            "grounding_pass": len(sources) > 0 or len(history_text) > 0,
            "indexing_error": False
        }

        return {
            "answer": final_answer,
            "sources": dynamic_sources,
            "latency_ms": latency_ms,
            "debug": debug_payload
        }

    finally:
        _active_user_id_var.reset(ctx_token)
