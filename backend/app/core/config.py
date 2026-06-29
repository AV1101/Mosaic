from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(PROJECT_ROOT / ".env"),
            str(BACKEND_ROOT / ".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://section_ai:section_ai@localhost:5432/section_ai"
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    upload_dir: str = "uploads"
    server_origin: str = "http://localhost:8000"
    ai_provider: str = "mock"
    openai_api_key: str = ""
    openai_model: str = "GPT-4o"
    figma_api_key: str = ""
    cors_origins: str = "http://localhost:3000"
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""   # e.g. https://your-resource.openai.azure.com
    azure_openai_deployment: str = ""
    azure_openai_deployment_gpt54: str = ""  # For GPT-5.4 model
    azure_openai_api_version: str = "2024-08-01-preview"


settings = Settings()
