from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SceneCreate(BaseModel):
    title: str
    script: str | None = None
    materials: str | None = None
    position: int = 0

    section_type: str | None = None
    status: str = "未着手"
    duration_seconds: int | None = None
    audio_path: str | None = None
    character_name: str | None = None
    character_expression: str | None = None
    background_path: str | None = None
    background_fit_mode: str = "cover"
    se_path: str | None = None
    telop: str | None = None
    direction: str | None = None
    edit_note: str | None = None
    voice_text: str | None = None
    subtitle_text: str | None = None


class SceneUpdate(BaseModel):
    title: str
    script: str | None = None
    materials: str | None = None
    position: int

    section_type: str | None = None
    status: str = "未着手"
    duration_seconds: int | None = None
    audio_path: str | None = None
    character_name: str | None = None
    character_expression: str | None = None
    background_path: str | None = None
    background_fit_mode: str = "cover"
    se_path: str | None = None
    telop: str | None = None
    direction: str | None = None
    edit_note: str | None = None
    voice_text: str | None = None
    subtitle_text: str | None = None


class SceneReorderItem(BaseModel):
    id: int
    position: int


class SceneResponse(BaseModel):
    id: int
    video_id: int
    title: str
    script: str | None
    materials: str | None
    position: int

    section_type: str | None
    status: str
    duration_seconds: int | None
    audio_path: str | None
    character_name: str | None
    character_expression: str | None
    background_path: str | None
    background_fit_mode: str
    se_path: str | None
    telop: str | None
    direction: str | None
    edit_note: str | None
    voice_text: str | None
    subtitle_text: str | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)