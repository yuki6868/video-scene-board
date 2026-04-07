from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AssetCreate(BaseModel):
    video_id: int
    scene_id: int | None = None
    asset_type: str = "material"
    title: str
    status: str = "idea"
    location_type: str = "none"
    path_or_url: str | None = None
    relative_path: str | None = None
    source_note: str | None = None
    search_keyword: str | None = None
    memo: str | None = None


class AssetUpdate(BaseModel):
    video_id: int | None = None
    scene_id: int | None = None
    asset_type: str | None = None
    title: str | None = None
    status: str | None = None
    location_type: str | None = None
    path_or_url: str | None = None
    relative_path: str | None = None
    source_note: str | None = None
    search_keyword: str | None = None
    memo: str | None = None


class AssetResponse(BaseModel):
    id: int
    video_id: int
    scene_id: int | None
    asset_type: str
    title: str
    status: str
    location_type: str
    path_or_url: str | None
    relative_path: str | None
    source_note: str | None
    search_keyword: str | None
    memo: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)