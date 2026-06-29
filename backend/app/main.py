from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import brands, generations, templates, uploads, users
from app.api import template_generation
from app.api import design_brands, design_templates
from app.api import components as components_router
from app.api import icons as icons_router
from app.api import categories as categories_router
from app.api import color_tokens as color_tokens_router
from app.api import typography as typography_router
from app.api import component_generation as component_generation_router
from app.core.config import settings

app = FastAPI(title="Mosaic Enterprise API", version="0.1.0")

origins = {origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()}
origins.update(
    {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    }
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication has been removed; the auth router is intentionally disabled.
# app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(generations.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(brands.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(design_brands.router, prefix="/api")
app.include_router(design_templates.router, prefix="/api")
app.include_router(template_generation.router, prefix="/api")
app.include_router(components_router.router, prefix="/api")
app.include_router(icons_router.router, prefix="/api")
app.include_router(categories_router.router, prefix="/api")
app.include_router(color_tokens_router.router, prefix="/api")
app.include_router(typography_router.router, prefix="/api")
app.include_router(component_generation_router.router, prefix="/api")

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok"}
