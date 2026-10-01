import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
    ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
    OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "qwen/qwen3-coder:free")
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "").strip().lower()

    JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me-please-32chars-x")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRES_MIN = int(os.getenv("JWT_EXPIRES_MIN", "480"))

    _in_catalyst = "X_ZOHO_CATALYST_LISTEN_PORT" in os.environ
    DB_PATH = os.getenv("DB_PATH", "/tmp/abhedya_crime.db" if _in_catalyst else "./abhedya_crime.db")
    CORS_ORIGINS = [o.strip() for o in os.getenv(
        "CORS_ORIGINS", "*"
    ).split(",") if o.strip()]

    def active_provider(self) -> str:
        valid = {"gemini","groq","openrouter","openai","anthropic","mock"}
        if self.LLM_PROVIDER in valid:
            return self.LLM_PROVIDER
        if self.GEMINI_API_KEY: return "gemini"
        if self.GROQ_API_KEY: return "groq"
        if self.OPENROUTER_API_KEY: return "openrouter"
        if self.OPENAI_API_KEY: return "openai"
        if self.ANTHROPIC_API_KEY: return "anthropic"
        return "mock"

settings = Settings()
