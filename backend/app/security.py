"""Encryption of users' Gemini API keys at rest."""
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException

from .config import settings


def _fernet() -> Fernet:
    if not settings.key_encryption_secret:
        raise HTTPException(status_code=500, detail="Server is missing KEY_ENCRYPTION_SECRET")
    return Fernet(settings.key_encryption_secret.encode())


def encrypt(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        raise HTTPException(status_code=500, detail="Stored key could not be decrypted")
