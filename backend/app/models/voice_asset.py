from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class VoiceAsset(Base):
    __tablename__ = "voice_assets"

    id = Column(Integer, primary_key=True, index=True)
    scene_id = Column(Integer, ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False, index=True)

    text = Column(String, nullable=False)
    style_id = Column(Integer, nullable=False)
    character_name = Column(String, nullable=False)
    style_name = Column(String, nullable=False)

    speed = Column(Float, nullable=False, default=1.0)
    pitch = Column(Float, nullable=False, default=0.0)
    intonation = Column(Float, nullable=False, default=1.0)
    volume = Column(Float, nullable=False, default=1.0)

    audio_path = Column(String, nullable=True)
    subtitle_png_path = Column(String, nullable=True)

    is_selected = Column(Boolean, nullable=False, default=False)

    voice_text = Column(Text, nullable=True)
    subtitle_text = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    scene = relationship("Scene", back_populates="voice_assets")