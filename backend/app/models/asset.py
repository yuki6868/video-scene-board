from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    scene_id = Column(Integer, ForeignKey("scenes.id", ondelete="SET NULL"), nullable=True, index=True)

    asset_type = Column(String(50), nullable=False, default="material")
    title = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="idea")
    location_type = Column(String(50), nullable=False, default="none")

    path_or_url = Column(String(1000), nullable=True)
    relative_path = Column(String(1000), nullable=True)
    source_note = Column(Text, nullable=True)
    search_keyword = Column(String(255), nullable=True)
    memo = Column(Text, nullable=True)

    video = relationship("Video", back_populates="assets")
    scene = relationship("Scene", back_populates="assets")

    is_credit_target = Column(Boolean, default=True)
    is_auto_generated = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )