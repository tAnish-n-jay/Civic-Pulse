import httpx
import os
import json
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"

async def analyze_issue(title: str, description: str) -> dict:
    prompt = f"""You are a civic issue classifier. Given a citizen's issue report, return ONLY valid JSON with these exact fields:
- category: one of [pothole, sewage, streetlight, garbage, water, infrastructure]
- severity: integer 1 to 5
- severity_reason: one sentence explanation
- assigned_department: e.g. "Roads Department", "Water Supply Board"
- impact_summary: one line summary of citizen impact

Issue Title: {title}
Issue Description: {description}

Return only JSON. No explanation. No markdown. No backticks."""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(GEMINI_URL, json=payload)
        response.raise_for_status()
        data = response.json()

    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()

    # Strip markdown fences if Gemini wraps in ```json
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]

    return json.loads(raw_text.strip())