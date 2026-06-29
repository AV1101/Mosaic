from sqlalchemy import Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    brand_name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
