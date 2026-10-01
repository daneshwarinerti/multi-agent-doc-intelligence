"""
app.py
------
Streamlit Web Application for Multi-Agent Document Intelligence System (Google ADK Edition).

Provides an interactive user interface:
- Sidebar: File upload & document ingestion execution
- Tab 1: Concise & Detailed Summaries
- Tab 2: Structured Analytical Insights
- Tab 3: Grounded Q&A Chat with Source Citations
"""

import asyncio
import os
import tempfile
import streamlit as st

import config
from agents.pipeline import run_ingestion_pipeline, generate_doc_id
from agents.qa import ask_question

# Page Configuration
st.set_page_config(
    page_title="Document Intelligence System (ADK)",
    page_icon="📄",
    layout="wide"
)

# Initialize Session States
if "pipeline_result" not in st.session_state:
    st.session_state.pipeline_result = None

if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

if "active_doc_id" not in st.session_state:
    st.session_state.active_doc_id = None

st.title("📄 Multi-Agent Document Intelligence System")
st.caption("Powered by Google ADK (google-adk), Gemini LLM, ChromaDB, and Streamlit")

# ==========================================
# SIDEBAR: DOCUMENT UPLOAD & INGESTION
# ==========================================
with st.sidebar:
    st.header("1. Upload Document")
    uploaded_file = st.file_uploader(
        "Choose a PDF, DOCX, or TXT file",
        type=["pdf", "docx", "txt"],
        help="Upload enterprise documents up to 25 MB."
    )

    if uploaded_file is not None:
        # File Size Validation
        file_size_mb = uploaded_file.size / (1024 * 1024)
        st.info(f"📁 **File:** `{uploaded_file.name}` ({file_size_mb:.2f} MB)")

        if file_size_mb > config.MAX_UPLOAD_SIZE_MB:
            st.error(f"❌ File size exceeds the {config.MAX_UPLOAD_SIZE_MB} MB limit.")
        else:
            if st.button("🚀 Process Document"):
                # Save uploaded file to a temporary location
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(uploaded_file.name)[1]) as tmp:
                    tmp.write(uploaded_file.getvalue())
                    tmp_path = tmp.name

                try:
                    with st.spinner("Processing document through ADK pipeline..."):
                        doc_id = generate_doc_id(tmp_path)
                        # Execute sequential ingestion pipeline
                        result = asyncio.run(run_ingestion_pipeline(tmp_path, doc_id=doc_id))
                        
                        st.session_state.pipeline_result = result
                        st.session_state.active_doc_id = doc_id
                        st.session_state.chat_history = []  # Reset chat history for new upload

                        st.success(f"✅ Ingestion Complete! ({result['page_count']} pages, {result['chunk_count']} chunks)")

                except Exception as e:
                    st.error(f"❌ Processing Error: {str(e)}")
                finally:
                    if os.path.exists(tmp_path):
                        os.remove(tmp_path)

    st.markdown("---")
    st.markdown("### Architecture Flow")
    st.markdown(
        "1. **Extractor:** Parses & chunks into ChromaDB\n"
        "2. **Summarizer:** Map-Reduce batching\n"
        "3. **Insights:** Structured JSON extraction\n"
        "4. **Q&A Agent:** Grounded RAG with page citations"
    )

# ==========================================
# MAIN CONTENT: TABS
# ==========================================
pipeline_res = st.session_state.get("pipeline_result")
if pipeline_res is None:
    st.info("👈 Upload a document in the sidebar and click **Process Document** to begin.")
else:
    res = pipeline_res
    doc_id = st.session_state.get("active_doc_id")

    tab_summary, tab_insights, tab_qa = st.tabs(["📝 Summaries", "💡 Insights", "💬 Ask Questions"])

    # ------------------------------------------
    # TAB 1: SUMMARIES
    # ------------------------------------------
    with tab_summary:
        st.subheader("Executive Concise Summary")
        st.success(res["concise_summary"])

        st.markdown("---")
        st.subheader("Detailed Sectioned Summary")
        st.markdown(res["detailed_summary"])

    # ------------------------------------------
    # TAB 2: INSIGHTS
    # ------------------------------------------
    with tab_insights:
        insights = res.get("insights", {})

        col1, col2 = st.columns(2)

        with col1:
            st.subheader("📌 Key Points")
            for kp in insights.get("key_points", []):
                st.markdown(f"- {kp}")

            st.subheader("🎯 Action Items")
            for ai in insights.get("action_items", []):
                st.markdown(f"- {ai}")

        with col2:
            st.subheader("📊 Themes")
            for theme in insights.get("themes", []):
                with st.expander(f"🔹 {theme.get('name', 'Theme')}"):
                    st.write(theme.get("description", ""))

            st.subheader("📈 Notable Facts & Metrics")
            for nf in insights.get("notable_facts", []):
                st.markdown(f"- {nf}")

    # ------------------------------------------
    # TAB 3: Q&A CHAT WITH SOURCES
    # ------------------------------------------
    with tab_qa:
        st.subheader("Document Q&A Chat")
        st.caption("Ask questions about the uploaded document. Answers are strictly grounded with page citations.")

        # Render conversation history using compatibility styling
        chat_history = st.session_state.get("chat_history", [])
        for msg in chat_history:
            role_prefix = "👤 **User:**" if msg["role"] == "user" else "🤖 **Assistant:**"
            st.markdown(f"{role_prefix} {msg['content']}")
            if "sources" in msg and msg["sources"]:
                with st.expander("📚 View Sources & Citations"):
                    for idx, src in enumerate(msg["sources"]):
                        st.markdown(f"**Source {idx+1} (Page {src['page_num']}):**")
                        st.caption(f"\"{src['text']}\"")
            st.markdown("---")

        # Chat Input Form (Compatible with Streamlit 1.12+)
        with st.form("qa_chat_form", clear_on_submit=True):
            user_query = st.text_input("Ask a question about this document:", key="user_question_input")
            submit_btn = st.form_submit_button("Send Question")

        if submit_btn and user_query.strip():
            user_text = user_query.strip()
            st.session_state["chat_history"].append({"role": "user", "content": user_text})

            with st.spinner("Searching document & generating answer..."):
                qa_response = asyncio.run(ask_question(doc_id=doc_id, question=user_text))
                answer_text = qa_response["answer"]
                sources = qa_response["sources"]

            st.session_state["chat_history"].append({
                "role": "assistant",
                "content": answer_text,
                "sources": sources
            })

            st.experimental_rerun()
