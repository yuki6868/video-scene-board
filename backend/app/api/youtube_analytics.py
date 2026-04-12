from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.schemas.youtube_analytics import YouTubeAnalyticsDailyResponse
from app.services.youtube.youtube_analytics_service import (
    get_video_analytics_daily,
    sync_video_analytics_daily,
)

router = APIRouter(prefix="/videos", tags=["youtube-analytics"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/{video_id}/analytics/daily", response_model=list[YouTubeAnalyticsDailyResponse])
def read_video_analytics_daily(video_id: int, db: Session = Depends(get_db)):
    return get_video_analytics_daily(db, video_id)


@router.post("/{video_id}/analytics/sync", response_model=list[YouTubeAnalyticsDailyResponse])
def sync_video_analytics(video_id: int, db: Session = Depends(get_db)):
    try:
        return sync_video_analytics_daily(db, video_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))