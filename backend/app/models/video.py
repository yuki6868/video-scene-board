from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)

    thumbnail_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    tags = Column(String, nullable=True)
    video_path = Column(String, nullable=True)
    youtube_url = Column(String, nullable=True)
    youtube_id = Column(String, nullable=True)
    published_at = Column(DateTime, nullable=True)

    concept = Column(String, nullable=True)
    target = Column(String, nullable=True)
    goal = Column(String, nullable=True)
    status = Column(String(50), nullable=False, default="draft")

    # 追加: 出力フォーマット設定
    aspect_ratio = Column(String(20), nullable=False, default="9:16")
    frame_width = Column(Integer, nullable=False, default=1080)
    frame_height = Column(Integer, nullable=False, default=1920)

    scenes = relationship(
        "Scene",
        back_populates="video",
        cascade="all, delete-orphan",
        order_by="Scene.position",
    )
    assets = relationship(
        "Asset",
        back_populates="video",
        cascade="all, delete-orphan",
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )