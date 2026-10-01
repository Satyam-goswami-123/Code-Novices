"""Provider-agnostic LLM client.

Supports Gemini, Groq, OpenRouter, OpenAI, Anthropic.
Groq + OpenRouter + OpenAI all use the OpenAI Python SDK (compatible APIs).
Falls back to a deterministic mock if nothing is configured.
"""
import json
from typing import Optional
from .config import settings


class LLMClient:
    def __init__(self):
        self.provider = settings.active_provider()
        self._init_provider()

    def _init_provider(self):
        self.client = None
        self.base_url = None
        if self.provider == "openai":
            from openai import OpenAI
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.OPENAI_MODEL
        elif self.provider == "groq":
            from openai import OpenAI
            self.client = OpenAI(api_key=settings.GROQ_API_KEY,
                                 base_url="https://api.groq.com/openai/v1")
            self.model = settings.GROQ_MODEL
        elif self.provider == "openrouter":
            from openai import OpenAI
            self.client = OpenAI(api_key=settings.OPENROUTER_API_KEY,
                                 base_url="https://openrouter.ai/api/v1",
                                 default_headers={
                                     "HTTP-Referer": "http://localhost:5173",
                                     "X-Title": "Abhedya-Chakra AI",
                                 })
            self.model = settings.OPENROUTER_MODEL
        elif self.provider == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.client = genai.GenerativeModel(settings.GEMINI_MODEL)
            self.model = settings.GEMINI_MODEL
        elif self.provider == "anthropic":
            import anthropic
            self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            self.model = settings.ANTHROPIC_MODEL
        else:
            self.model = "mock"

    def _openai_compatible(self, system, user, json_mode, max_tokens):
        kwargs = {
            "model": self.model,
            "messages": [{"role":"system","content":system},
                         {"role":"user","content":user}],
            "max_tokens": max_tokens,
            "temperature": 0.2,
        }
        # Not every OpenAI-compatible endpoint supports response_format reliably.
        # For Groq/OpenRouter free models, we ask for JSON in the prompt instead.
        if json_mode and self.provider == "openai":
            kwargs["response_format"] = {"type": "json_object"}
        r = self.client.chat.completions.create(**kwargs)
        return r.choices[0].message.content or ""

    def complete(self, system: str, user: str, json_mode: bool = False,
                 max_tokens: int = 1200) -> str:
        try:
            if self.provider in ("openai","groq","openrouter"):
                if json_mode and self.provider != "openai":
                    user = user + "\n\nIMPORTANT: respond with ONLY valid JSON. No prose, no markdown fences."
                return self._openai_compatible(system, user, json_mode, max_tokens)
            if self.provider == "gemini":
                prompt = f"{system}\n\n---\n{user}"
                # Gemini 2.5 uses internal "thinking" tokens that count against the
                # output budget. Multiply by ~6x for safety.
                budget = max_tokens * 6
                cfg = {"temperature": 0.2, "max_output_tokens": budget}
                if json_mode:
                    cfg["response_mime_type"] = "application/json"
                r = self.client.generate_content(prompt, generation_config=cfg)
                # r.text raises on empty candidates; guard
                try: txt = r.text
                except Exception: txt = ""
                return txt or ""
            if self.provider == "anthropic":
                r = self.client.messages.create(
                    model=self.model, max_tokens=max_tokens, temperature=0.2,
                    system=system,
                    messages=[{"role":"user","content":user}])
                return r.content[0].text if r.content else ""
        except Exception as e:
            return self._mock(system, user, json_mode, error=str(e))
        return self._mock(system, user, json_mode)

    def _mock(self, system: str, user: str, json_mode: bool, error: Optional[str]=None) -> str:
        if json_mode:
            return json.dumps({
                "sql": None,
                "answer": "Mock response (no AI provider available). " + (f"Error: {error}" if error else "Add a key in backend/.env."),
                "rationale": "Provider unavailable; canned reply.",
            })
        return ("(Mock AI) Provider call failed or no key configured. "
                + (f"Error: {error}" if error else ""))


llm = LLMClient()
