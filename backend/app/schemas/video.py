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

    concept: Optional[str] = None
    target: Optional[str] = None
    goal: Optional[str] = None

    structure: Optional[str] = None
    script: Optional[str] = None
    memo: Optional[str] = None

    status: str = "draft"
    analytics_source: str = "mock"

    aspect_ratio: str = "9:16"
    frame_width: int = 1080
    frame_height: int = 1920


class VideoCreate(VideoBase):
    pass


class VideoUpdate(VideoBase):
    pass


class VideoResponse(VideoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DavinciExportRequest(BaseModel):
    export_name: Optional[str] = None