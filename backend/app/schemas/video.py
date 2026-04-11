from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class VideoBase(BaseModel):
    title: str
    thumbnail_url: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None
    video_path: Optional[str] = None
    youtube_url: Optional[str] = None
    youtube_id: Optional[str] = None
    published_at: Optional[datetime] = None


class VideoCreate(BaseModel):
    title: str
    description: str | None = None
    concept: Optional[str] = None
    target: Optional[str] = None
    goal: Optional[str] = None
    status: str = "draft"


class VideoUpdate(BaseModel):
    title: str
    description: str | None = None
    concept: str | None = None
    target: str | None = None
    goal: str | None = None
    status: str


class VideoResponse(BaseModel):
    id: int
    title: str
    description: str | None
    concept: str | None
    target: str | None
    goal: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)