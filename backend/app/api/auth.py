from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])

# Authentication endpoints have been removed.
# The previous register, login, me, and logout routes are intentionally disabled.
