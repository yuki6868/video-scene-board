from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TaskBase(BaseModel):
    video_id: int
    scene_id: Optional[int] = None
    title: str
    detail: Optional[str] = None
    task_type: str = "加工"
    priority: str = "中"
    status: str = "未着手"


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    video_id: Optional[int] = None
    scene_id: Optional[int] = None
    title: Optional[str] = None
    detail: Optional[str] = None
    task_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class TaskResponse(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True