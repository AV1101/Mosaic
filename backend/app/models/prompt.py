from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from app.db.base import Base


class Prompt(Base):
    __tablename__ = "prompts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    component_id: Mapped[int | None] = mapped_column(ForeignKey("components.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text)
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    developer_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_prompt_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    negative_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_input: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_output_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_placeholders = mapped_column(JSON, default=list)
    design_constraints = mapped_column(JSON, default=dict)
    accessibility_requirements = mapped_column(JSON, default=dict)
    framework_targets = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    version: Mapped[int] = mapped_column(Integer, default=1)
    ai_metadata = mapped_column(JSON, default=dict)
    embedding = mapped_column(Vector(1536), nullable=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    created_by = relationship("User")
