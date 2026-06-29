from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TemplateBrandFrame(Base):
    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    template_name: Mapped[str] = mapped_column(Text, nullable=False)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories_templates.id"), nullable=False
    )
    brand_name: Mapped[str] = mapped_column(Text, nullable=False)
    figma_frame_url: Mapped[str] = mapped_column(Text, nullable=False)
    preview_image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    text_only: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    icon_only: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image_field: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    text_icon: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    field_labels: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    category: Mapped["CategoryTemplate"] = relationship(  # type: ignore[name-defined]
        "CategoryTemplate", lazy="selectin"
    )
