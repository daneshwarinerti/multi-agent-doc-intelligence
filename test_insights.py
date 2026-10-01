"""
test_insights.py
----------------
Verification script for Phase 4, Stage 2 (agents/insights.py).
Tests structured JSON insights generation and fallback parser.
"""

import asyncio
from agents.insights import generate_insights, _parse_insights_json

async def run_test():
    sample_partial_summaries = [
        "In 2023, Global Logistics Inc. reported total revenue of $8.4 billion (12% YoY growth) and operating income of $1.1 billion.",
        "Freight Forwarding expanded rapidly in South East Asia. Maritime operations faced fuel price volatility.",
        "Management invested $120 million in fleet electrification, achieving a 14% reduction in urban carbon emissions."
    ]

    print("=== TEST 1: EXECUTING ADK INSIGHTS AGENT ===")
    insights = await generate_insights(sample_partial_summaries)

    print(f"Key Points Count: {len(insights['key_points'])}")
    for kp in insights['key_points']:
        print(f"  • {kp}")

    print(f"\nThemes Count: {len(insights['themes'])}")
    for t in insights['themes']:
        print(f"  • {t.get('name')}: {t.get('description')}")

    print(f"\nAction Items Count: {len(insights['action_items'])}")
    for ai in insights['action_items']:
        print(f"  • {ai}")

    print(f"\nNotable Facts Count: {len(insights['notable_facts'])}")
    for nf in insights['notable_facts']:
        print(f"  • {nf}")

    print("\n" + "="*70 + "\n")

    print("=== TEST 2: MALFORMED NON-JSON FALLBACK PARSER ===")
    malformed_llm_text = """
    - Total revenue grew to $8.4B in 2023
    - Freight Forwarding expanded in SE Asia
    - Carbon emissions fell by 14%
    - Recommendation: Expand EV charging stations
    """
    fallback_result = _parse_insights_json(malformed_llm_text)
    print("Fallback Parsed Output:")
    print(fallback_result)

if __name__ == "__main__":
    asyncio.run(run_test())
