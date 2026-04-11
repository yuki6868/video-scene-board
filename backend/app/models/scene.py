from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Scene(Base):
    __tablename__ = "scenes"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    script = Column(Text, nullable=True)
    materials = Column(Text, nullable=True)
    position = Column(Integer, nullable=False, default=0)


    section_type = Column(String(50), nullable=True)       # 導入 / 展開 / 対立 / オチ
    status = Column(String(50), nullable=False, default="未着手")
    duration_seconds = Column(Integer, nullable=True)

    audio_path = Column(String(500), nullable=True)
    character_name = Column(String(255), nullable=True)
    character_expression = Column(String(255), nullable=True)
    background_path = Column(String(500), nullable=True)
    background_fit_mode = Column(String(50), nullable=False, default="cover")
    se_path = Column(String(500), nullable=True)

    telop = Column(Text, nullable=True)
    direction = Column(Text, nullable=True)
    edit_note = Column(Text, nullable=True)

    video = relationship("Video", back_populates="scenes")
    assets = relationship("Asset", back_populates="scene")
    voice_assets = relationship(
        "VoiceAsset",
        back_populates="scene",
        cascade="all, delete-orphan"
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)