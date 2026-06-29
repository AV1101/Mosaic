from sqlalchemy import Integer, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DesignBrand(Base):
    __tablename__ = "design_brands"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    tokens: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
