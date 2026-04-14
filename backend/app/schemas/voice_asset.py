from datetime import datetime
from pydantic import BaseModel, ConfigDict


class VoiceAssetGenerateRequest(BaseModel):
    scene_id: int
    text: str | None = None
    voice_text: str | None = None
    subtitle_text: str | None = None
    style_id: int
    speed: float = 1.0
    pitch: float = 0.0
    intonation: float = 1.0
    volume: float = 1.0


class VoiceAssetResponse(BaseModel):
    id: int
    scene_id: int
    text: str
    voice_text: str | None = None
    subtitle_text: str | None = None
    style_id: int
    character_name: str
    style_name: str
    speed: float
    pitch: float
    intonation: float
    volume: float
    audio_path: str | None = None
    subtitle_png_path: str | None = None
    is_selected: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)