from sqlalchemy import DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Icon(Base):
    __tablename__ = "icons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    variant: Mapped[str] = mapped_column(String(20), nullable=False)  # filled, outlined, rounded, sharp, two_tone
    category: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    codepoint: Mapped[str | None] = mapped_column(String(10), nullable=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("name", "variant", name="uq_icon_name_variant"),
    )
