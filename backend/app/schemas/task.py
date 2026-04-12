from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TaskBase(BaseModel):
    video_id: int
    scene_id: int | None = None
    asset_id: int | None = None
    parent_task_id: int | None = None
    title: str
    detail: str | None = None
    task_type: str
    priority: str
    status: str


class TaskCreate(TaskBase):
    sort_order: int | None = None


class TaskUpdate(BaseModel):
    video_id: Optional[int] = None
    scene_id: Optional[int] = None
    asset_id: Optional[int] = None
    parent_task_id: int | None = None
    title: Optional[str] = None
    detail: Optional[str] = None
    task_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    sort_order: Optional[int] = None


class TaskResponse(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime
    parent_task_id: int | None = None
    sort_order: int

    class Config:
        from_attributes = True