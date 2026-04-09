from datetime import datetime
from pydantic import BaseModel


class VoiceAssetBase(BaseModel):
    text: str
    style_id: int
    character_name: str
    style_name: str
    speed: float = 1.0
    pitch: float = 0.0
    intonation: float = 1.0
    volume: float = 1.0
    audio_path: str | None = None
    subtitle_png_path: str | None = None
    is_selected: bool = False


class VoiceAssetCreate(VoiceAssetBase):
    scene_id: int


class VoiceAssetResponse(VoiceAssetBase):
    id: int
    scene_id: int
    created_at: datetime

    class Config:
        from_attributes = True