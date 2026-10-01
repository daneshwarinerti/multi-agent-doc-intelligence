"""
agents/summarizer.py
--------------------
Map-Reduce Summarizer Agent module using Google ADK.

Handles 100+ page documents efficiently by:
1. Map Phase: Splitting total document chunks into ~12,000-character batches and summarizing each batch.
2. Reduce Phase: Combining partial batch summaries into:
   - A Concise Summary (~150 words executive summary)
   - A Detailed Summary (Comprehensive, sectioned breakdown)
"""

import asyncio
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from vector_store import VectorStore
import config

_store = VectorStore()

def create_summarizer_agent(model_name: str = config.DEFAULT_MODEL) -> Agent:
    """
    Creates and configures the ADK Summarizer Agent.
    """
    instruction = """
You are an expert document summarizer. Your task is to produce accurate, objective, and faithful summaries of document excerpts provided to you.

RULES:
1. Never invent facts, numbers, or conclusions not supported by the provided text.
2. Maintain neutral, professional tone.
3. Ignore formatting noise and focus on key findings, metrics, and main arguments.
4. Maintain continuous word boundaries. Never insert line breaks or paragraph splits inside hyphenated terms (e.g. write 'one-year initiative', '1-year duration', 'soft-skill', 'AI-Based' on a single continuous line).
"""
    return Agent(
        name="summarizer_agent",
        model=model_name,
        instruction=instruction
    )

async def _summarize_text_block(agent: Agent, text: str, mode_instruction: str) -> str:
    """Helper function to execute an ADK agent call on a specific block of text."""
    session_service = InMemorySessionService()
    runner = Runner(agent=agent, app_name="summary_app", session_service=session_service)
    session = await session_service.create_session(app_name="summary_app", user_id="summary_user")

    prompt = f"{mode_instruction}\n\n[DOCUMENT TEXT]:\n{text}"
    user_message = types.Content(
        role="user",
        parts=[types.Part.from_text(text=prompt)]
    )

    summary = ""
    async for event in runner.run_async(
        user_id="summary_user",
        session_id=session.id,
        new_message=user_message
    ):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    summary += part.text

    return summary.strip()

async def generate_summaries(doc_id: str, user_id: str = "default_user", model_name: str = config.DEFAULT_MODEL) -> dict:
    """
    Map-Reduce summarization entry point.

    Returns:
    {
      "partial_summaries": ["Batch 1 summary...", "Batch 2 summary..."],
      "concise_summary": "150-word executive summary...",
      "detailed_summary": "Full sectioned summary..."
    }
    """
    chunks = _store.get_all_chunks(doc_id, user_id=user_id)
    if not chunks:
        return {
            "partial_summaries": [],
            "concise_summary": "No text found in document to summarize.",
            "detailed_summary": "No text found in document to summarize."
        }

    agent = create_summarizer_agent(model_name=model_name)

    # 1. Map Step: Group chunks into batches up to SUMMARY_BATCH_CHAR_LIMIT
    batches = []
    current_batch = []
    current_length = 0

    for chunk in chunks:
        text = chunk["text"]
        if current_length + len(text) > config.SUMMARY_BATCH_CHAR_LIMIT and current_batch:
            batches.append("\n\n".join(current_batch))
            current_batch = [text]
            current_length = len(text)
        else:
            current_batch.append(text)
            current_length += len(text)

    if current_batch:
        batches.append("\n\n".join(current_batch))

    # Summarize each batch (Map)
    partial_summaries = []
    for idx, batch_text in enumerate(batches):
        map_prompt = f"Summarize Batch {idx+1}/{len(batches)} concisely, capturing key facts, numbers, and decisions."
        batch_summary = await _summarize_text_block(agent, batch_text, map_prompt)
        partial_summaries.append(batch_summary)

    # 2. Reduce Step: Combine partial summaries into concise and detailed summaries
    combined_partials = "\n\n".join([f"Section {i+1}: Summary\n{s}" for i, s in enumerate(partial_summaries)])

    concise_prompt = "Write a concise executive summary (strictly 2 to 4 sentences maximum) capturing only the core thesis and top key takeaways of the document."
    concise_summary = await _summarize_text_block(agent, combined_partials, concise_prompt)

    detailed_prompt = "Write a comprehensive, in-depth Detailed Summary organized into numbered markdown section headings (e.g. ### Section 01: Executive Overview, ### Section 02: Market Demand & Key Metrics) covering all major topics, figures, and technical points. Use colons (:) to separate section numbers and titles. Do NOT use slashes (/) or hyphens (-)."
    detailed_summary = await _summarize_text_block(agent, combined_partials, detailed_prompt)

    return {
        "partial_summaries": partial_summaries,
        "concise_summary": concise_summary,
        "detailed_summary": detailed_summary
    }
