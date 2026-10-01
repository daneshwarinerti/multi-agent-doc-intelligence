"""
agents/insights.py
------------------
Insights Agent module using Google ADK.

Reads partial batch summaries from the Summarizer Agent and produces 
structured analytical insights (key points, themes, action items, notable facts).
Includes robust JSON parsing fallback to prevent pipeline failures.
"""

import json
import re
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

import config

def create_insights_agent(model_name: str = config.DEFAULT_MODEL) -> Agent:
    """Creates and configures the ADK Insights Agent."""
    instruction = """
You are an expert document intelligence analyst. Your job is to analyze document summaries and extract four strictly non-overlapping categories of insights:

1. key_points: The primary executive takeaways of the document (3-5 items).
2. themes: Broader structural patterns or strategic themes across the document (2-3 items).
3. action_items: Concrete recommendations or next steps derived from the text (2-3 items).
4. notable_facts: Specific empirical numbers, dates, rates, or statistics. EVERY item MUST follow the format "VALUE: Measure Label" using a colon separator (e.g. "€380B: Refinancing Wall", "33% CAGR: Industry Growth", "$12,00,000: Average Annual Salary").

You MUST respond strictly in valid JSON format matching this schema:
{
  "key_points": ["Key point 1...", "Key point 2..."],
  "themes": [
    {"name": "Theme Name", "description": "Theme description..."}
  ],
  "action_items": ["Action item 1..."],
  "notable_facts": ["$4.2B: Annual Revenue", "24%: YoY Revenue Growth"]
}

Do NOT repeat information between sections. Do NOT wrap response in markdown backticks. Respond only with raw JSON.
"""
    return Agent(
        name="insights_agent",
        model=model_name,
        instruction=instruction
    )

def _parse_insights_json(response_text: str) -> dict:
    """
    Parses LLM response as JSON. If malformed, uses regex/line fallback.
    """
    clean_text = response_text.strip()
    
    # Strip markdown ```json ... ``` codeblocks if present
    if clean_text.startswith("```"):
        clean_text = re.sub(r"^```[a-zA-Z]*\n?", "", clean_text)
        clean_text = re.sub(r"\n?```$", "", clean_text).strip()

    try:
        data = json.loads(clean_text)
        if isinstance(data, dict):
            return {
                "key_points": data.get("key_points", []),
                "themes": data.get("themes", []),
                "action_items": data.get("action_items", []),
                "notable_facts": data.get("notable_facts", [])
            }
    except Exception:
        pass

    # Fallback parser if JSON fails
    print("WARNING: Insights LLM returned non-JSON text. Executing fallback parser.")
    lines = [line.strip("- *• ") for line in response_text.split("\n") if line.strip()]
    return {
        "key_points": lines[:4],
        "themes": [{"name": "Key Findings", "description": line} for line in lines[4:7]],
        "action_items": lines[7:10],
        "notable_facts": lines[10:]
    }

async def generate_insights(partial_summaries: list[str], model_name: str = config.DEFAULT_MODEL) -> dict:
    """
    Generates structured insights using partial summaries from the Summarizer Agent.

    Parameters:
    - partial_summaries: List of batch summary strings from Summarizer.

    Returns:
    - Dict with key_points, themes, action_items, notable_facts.
    """
    if not partial_summaries:
        return {
            "key_points": ["No text available to extract insights."],
            "themes": [],
            "action_items": [],
            "notable_facts": []
        }

    agent = create_insights_agent(model_name=model_name)
    session_service = InMemorySessionService()
    runner = Runner(agent=agent, app_name="insights_app", session_service=session_service)
    session = await session_service.create_session(app_name="insights_app", user_id="insights_user")

    summaries_text = "\n\n".join([f"--- Section {i+1} ---\n{s}" for i, s in enumerate(partial_summaries)])
    prompt = f"Analyze the section summaries below and extract structured JSON insights:\n\n{summaries_text}"

    user_message = types.Content(
        role="user",
        parts=[types.Part.from_text(text=prompt)]
    )

    response_text = ""
    async for event in runner.run_async(
        user_id="insights_user",
        session_id=session.id,
        new_message=user_message
    ):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    response_text += part.text

    return _parse_insights_json(response_text)
