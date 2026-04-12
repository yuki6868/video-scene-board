from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class YouTubeAnalyticsDailyBase(BaseModel):
    video_id: int
    youtube_video_id: str
    metric_date: date

    views: int = 0
    likes: int = 0
    comments: int = 0

    average_view_duration_seconds: float = 0
    watch_time_minutes: float = 0

    impressions: int = 0
    impression_click_through_rate: float = 0

    subscribers_gained: int = 0

    data_source: str = "mock"


class YouTubeAnalyticsDailyCreate(YouTubeAnalyticsDailyBase):
    pass


class YouTubeAnalyticsDailyResponse(YouTubeAnalyticsDailyBase):
    id: int
    fetched_at: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True