from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


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
    status: str


class VideoResponse(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)