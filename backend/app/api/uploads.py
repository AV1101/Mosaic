from fastapi import APIRouter, Depends, UploadFile

from app.auth.dependencies import require_roles
from app.models import User
from app.services.storage_service import storage_service

router = APIRouter(prefix="/upload", tags=["uploads"])


@router.post("", response_model=dict)
async def upload(file: UploadFile, user: User = Depends(require_roles("admin", "designer"))):
    url = await storage_service.save(file)
    return {"url": url}
