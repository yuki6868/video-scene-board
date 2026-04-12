from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from datetime import datetime

from app.db.database import Base


class YouTubeAnalyticsDaily(Base):
    __tablename__ = "youtube_analytics_daily"

    id = Column(Integer, primary_key=True, index=True)

    # Videoとの紐付け
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    youtube_video_id = Column(String, nullable=False)

    # 日付
    metric_date = Column(Date, nullable=False)

    # 指標
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)

    average_view_duration_seconds = Column(Float, default=0)
    watch_time_minutes = Column(Float, default=0)

    impressions = Column(Integer, default=0)
    impression_click_through_rate = Column(Float, default=0)

    subscribers_gained = Column(Integer, default=0)

    # データ元
    data_source = Column(String, default="mock")  # mock / api

    # 管理用
    fetched_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)