"""Central configuration. Every environment variable the backend reads lives here."""
import os
from dataclasses import dataclass, field
from typing import List

from dotenv import load_dotenv

load_dotenv()


def _split(value: str) -> List[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    # Firebase
    firebase_credentials: str = os.getenv("FIREBASE_CREDENTIALS", "")
    firebase_cred_path: str = os.getenv("FIREBASE_CRED_PATH", "")

    # Gemini
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    # Optional server key: only used for the public "random fact" endpoint and food image analysis fallback.
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    # Fernet key used to encrypt users' Gemini keys at rest.
    key_encryption_secret: str = os.getenv("KEY_ENCRYPTION_SECRET", "")

    # Third parties
    spoonacular_api_key: str = os.getenv("SPOONACULAR_API_KEY", "")
    cloudinary_cloud_name: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    cloudinary_api_key: str = os.getenv("CLOUDINARY_API_KEY", "")
    cloudinary_api_secret: str = os.getenv("CLOUDINARY_API_SECRET", "")

    # HTTP
    allowed_origins: List[str] = field(
        default_factory=lambda: _split(
            os.getenv(
                "ALLOWED_ORIGINS",
                "http://localhost:3000,http://127.0.0.1:3000,https://ournold.vercel.app",
            )
        )
    )

    # Rate limits (requests per window, per user)
    ai_rate_limit: int = int(os.getenv("AI_RATE_LIMIT", "30"))
    ai_rate_window_sec: int = int(os.getenv("AI_RATE_WINDOW_SEC", "60"))


settings = Settings()
