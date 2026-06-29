from pathlib import Path
from uuid import uuid4
from fastapi import HTTPException, UploadFile

from app.core.config import settings

_ALLOWED_MIME_TYPES = {"image/png", "image/jpeg"}


class StorageService:
    def __init__(self) -> None:
        self.root = Path(settings.upload_dir)
        self.root.mkdir(parents=True, exist_ok=True)

    async def save(self, file: UploadFile) -> str:
        content_type = (file.content_type or "").split(";")[0].strip().lower()
        if content_type not in _ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{content_type}'. Only PNG and JPEG are allowed.",
            )
        suffix = Path(file.filename or "").suffix or ".bin"
        path = self.root / f"{uuid4().hex}{suffix}"
        path.write_bytes(await file.read())
        return f"{settings.server_origin}/uploads/{path.name}"


storage_service = StorageService()
