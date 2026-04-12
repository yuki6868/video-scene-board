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

class YouTubeAnalyticsSummaryResponse(BaseModel):
    video_id: int

    latest_metric_date: Optional[date] = None

    latest_views: int = 0
    latest_likes: int = 0
    latest_comments: int = 0
    latest_average_view_duration_seconds: float = 0
    latest_watch_time_minutes: float = 0
    latest_impressions: int = 0
    latest_impression_click_through_rate: float = 0
    latest_subscribers_gained: int = 0

    views_last_7_days: int = 0
    watch_time_minutes_last_7_days: float = 0
    subscribers_gained_last_7_days: int = 0

    views_diff_vs_previous_day: int = 0
    ctr_diff_vs_previous_day: float = 0

    class Config:
        from_attributes = True

class GenderRatioResponse(BaseModel):
    male: float = 0
    female: float = 0
    other: float = 0


class AgeDistributionResponse(BaseModel):
    age_13_17: float = 0
    age_18_24: float = 0
    age_25_34: float = 0
    age_35_44: float = 0
    age_45_54: float = 0
    age_55_64: float = 0
    age_65_plus: float = 0


class YouTubeAudienceSummaryResponse(BaseModel):
    video_id: int
    metric_date: Optional[date] = None
    gender_ratio: GenderRatioResponse
    age_distribution: AgeDistributionResponse
    data_source: str = "mock"