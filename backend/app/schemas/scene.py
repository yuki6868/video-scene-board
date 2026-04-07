from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SceneCreate(BaseModel):
    title: str
    script: str | None = None
    materials: str | None = None
    position: int = 0


class SceneResponse(BaseModel):
    id: int
    title: str
    script: str | None
    materials: str | None
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)