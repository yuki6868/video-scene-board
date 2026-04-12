from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.video import Video
from app.models.youtube_analytics_daily import YouTubeAnalyticsDaily
from app.services.youtube.provider_factory import get_youtube_analytics_provider


def get_video_analytics_daily(db: Session, video_id: int) -> list[YouTubeAnalyticsDaily]:
    return (
        db.query(YouTubeAnalyticsDaily)
        .filter(YouTubeAnalyticsDaily.video_id == video_id)
        .order_by(YouTubeAnalyticsDaily.metric_date.asc())
        .all()
    )


def sync_video_analytics_daily(db: Session, video_id: int) -> list[YouTubeAnalyticsDaily]:
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise ValueError("動画が見つかりません。")

    if not video.youtube_id:
        raise ValueError("YouTube ID が設定されていません。")

    provider = get_youtube_analytics_provider()

    # 最初は直近7日を同期
    end_date = date.today()
    start_date = end_date - timedelta(days=6)

    metrics = provider.fetch_video_daily_metrics(
        youtube_video_id=video.youtube_id,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
    )

    saved_items = []

    for item in metrics:
        metric_date = date.fromisoformat(item["metric_date"])

        existing = (
            db.query(YouTubeAnalyticsDaily)
            .filter(
                YouTubeAnalyticsDaily.video_id == video.id,
                YouTubeAnalyticsDaily.metric_date == metric_date,
            )
            .first()
        )

        if existing:
            existing.youtube_video_id = item["youtube_video_id"]
            existing.views = item["views"]
            existing.likes = item["likes"]
            existing.comments = item["comments"]
            existing.average_view_duration_seconds = item["average_view_duration_seconds"]
            existing.watch_time_minutes = item["watch_time_minutes"]
            existing.impressions = item["impressions"]
            existing.impression_click_through_rate = item["impression_click_through_rate"]
            existing.subscribers_gained = item["subscribers_gained"]
            existing.data_source = item["data_source"]
            saved_items.append(existing)
        else:
            row = YouTubeAnalyticsDaily(
                video_id=video.id,
                youtube_video_id=item["youtube_video_id"],
                metric_date=metric_date,
                views=item["views"],
                likes=item["likes"],
                comments=item["comments"],
                average_view_duration_seconds=item["average_view_duration_seconds"],
                watch_time_minutes=item["watch_time_minutes"],
                impressions=item["impressions"],
                impression_click_through_rate=item["impression_click_through_rate"],
                subscribers_gained=item["subscribers_gained"],
                data_source=item["data_source"],
            )
            db.add(row)
            saved_items.append(row)

    db.commit()

    return (
        db.query(YouTubeAnalyticsDaily)
        .filter(YouTubeAnalyticsDaily.video_id == video.id)
        .order_by(YouTubeAnalyticsDaily.metric_date.asc())
        .all()
    )