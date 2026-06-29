from sqlalchemy import DateTime, Integer, JSON, LargeBinary, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Component(Base):
    __tablename__ = "components"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(100), default="")
    design_system: Mapped[str] = mapped_column(String(120), default="Chatbot Design System")
    status: Mapped[str] = mapped_column(String(32), default="active")
    preview_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    supported_variants = mapped_column(JSON, nullable=False, default=list)
    supported_sizes = mapped_column(JSON, nullable=False, default=list)
    supported_states = mapped_column(JSON, nullable=False, default=list)
    content_modes = mapped_column(JSON, nullable=False, default=list)
    capabilities_json = mapped_column(JSON, nullable=False, default=dict)
    structure_json = mapped_column(JSON, nullable=False, default=dict)
    metadata_json = mapped_column(JSON, nullable=False, default=dict)
    embedding: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    figma_frame_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    figma_file_url_2: Mapped[str | None] = mapped_column(Text, nullable=True)
    field_labels: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    text_only: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    icon_only: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    icon_text: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image_field: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
