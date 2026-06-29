from sqlalchemy import DateTime, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TypographyStyle(Base):
    __tablename__ = "typography"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    style: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
