from typing import Optional, List, Dict
"""Vision-evidence analysis: image -> structured forensic entities -> DB matches.

Uses OpenRouter's llama-3.2-vision model. Falls back gracefully if no key.
"""
import base64, json, re
import httpx
from .config import settings
from .semantic import search as semantic_search


VISION_SYSTEM = """You are a forensic image analyst for the Abhedya-Chakra Police.
Examine the supplied image and extract investigation-relevant entities.

Return STRICT JSON:
{
  "scene_summary": "1-2 sentence neutral description",
  "weapons": ["..."],
  "vehicles": [{"type":"e.g. motorcycle","color":"","plate":""}],
  "persons": [{"description":"clothing/build/face/age estimate","count":1}],
  "location_clues": ["e.g. shop board language","building type","road signs"],
  "suspected_crime_categories": ["Theft|Robbery|Assault|Murder|Vehicle Theft|..."],
  "investigation_keywords": ["short phrases to search FIR DB"],
  "confidence": "low|medium|high"
}
Be conservative. Use empty arrays if not visible. Never invent license plates."""


def _vision_call_openrouter(image_b64: str, mime: str) -> Optional[dict]:
    if not settings.OPENROUTER_API_KEY:
        return None
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Abhedya-Chakra",
    }
    payload = {
        "model": "meta-llama/llama-3.2-11b-vision-instruct:free",
        "messages": [
            {"role": "system", "content": VISION_SYSTEM},
            {"role": "user", "content": [
                {"type": "text", "text": "Analyze this evidence image. Return JSON only."},
                {"type": "image_url",
                 "image_url": {"url": f"data:{mime};base64,{image_b64}"}}
            ]}
        ],
        "max_tokens": 800,
        "temperature": 0.1,
    }
    try:
        r = httpx.post(url, headers=headers, json=payload, timeout=60.0)
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
        try: return json.loads(text)
        except:
            m = re.search(r"\{.*\}", text, re.S)
            return json.loads(m.group(0)) if m else {"scene_summary": text[:400]}
    except Exception as e:
        return {"error": str(e), "scene_summary": "(vision model call failed)"}


def _vision_call_gemini(image_bytes: bytes, mime: str) -> dict:
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    try:
        r = model.generate_content([
            VISION_SYSTEM,
            "Analyze this evidence image. Return JSON only.",
            {"mime_type": mime, "data": image_bytes}
        ], generation_config={"response_mime_type": "application/json"})
        return json.loads(r.text)
    except Exception as e:
        return {"error": str(e), "scene_summary": f"(Gemini vision model call failed: {e})"}

def analyze(image_bytes: bytes, mime: str = "image/jpeg") -> dict:
    image_b64 = base64.b64encode(image_bytes).decode()
    
    extracted = None
    if settings.GEMINI_API_KEY:
        extracted = _vision_call_gemini(image_bytes, mime)
    elif settings.OPENROUTER_API_KEY:
        extracted = _vision_call_openrouter(image_b64, mime)
        
    if not extracted or "error" in extracted:
        err = extracted.get("error", "No Vision API key configured (Gemini/OpenRouter)") if extracted else "No Vision API key configured (Gemini/OpenRouter)"
        extracted = {
            "scene_summary": f"({err} — vision disabled.)",
            "weapons": [], "vehicles": [], "persons": [], "location_clues": [],
            "suspected_crime_categories": [], "investigation_keywords": [],
            "confidence": "low"
        }
    # Build search query from extracted entities
    keywords = []
    keywords += extracted.get("weapons", [])
    keywords += [v.get("type","") + " " + v.get("color","") for v in extracted.get("vehicles", [])]
    keywords += extracted.get("investigation_keywords", [])
    keywords += extracted.get("suspected_crime_categories", [])
    query = " ".join([k for k in keywords if k]).strip()
    matches = semantic_search(query, top_k=5) if query else []
    return {"extracted": extracted, "query": query, "matches": matches}
