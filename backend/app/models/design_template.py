from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DesignTemplate(Base):
    __tablename__ = "design_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    figma_file_url: Mapped[str] = mapped_column(Text, nullable=False)
    preview_img_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
