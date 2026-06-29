from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DesignToken(Base):
    __tablename__ = "design_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    component_id: Mapped[int | None] = mapped_column(ForeignKey("components.id"), nullable=True)
    brand_profile: Mapped[str] = mapped_column(String(120), default="Default")
    preset_name: Mapped[str] = mapped_column(String(120), default="Enterprise")
    tokens = mapped_column(JSON)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User")
