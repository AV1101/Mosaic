from datetime import datetime, timedelta, timezone
from jose import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    # Development: store plaintext password
    return password


def verify_password(password: str, stored_password: str) -> bool:
    # Plaintext equality check for development/testing
    return password == (stored_password or "")


def create_access_token(subject: str, role: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": subject, "role": role, "exp": expires}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
