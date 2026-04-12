from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.video import Video
from app.models.youtube_analytics_daily import YouTubeAnalyticsDaily
from app.services.youtube.provider_factory import get_youtube_analytics_provider
from app.schemas.youtube_analytics import YouTubeAnalyticsSummaryResponse


def get_video_analytics_daily(db: Session, video_id: int) -> list[YouTubeAnalyticsDaily]:
    return (
        db.query(YouTubeAnalyticsDaily)
        .filter(YouTubeAnalyticsDaily.video_id == video_id)
        .order_by(YouTubeAnalyticsDaily.metric_date.asc())
        .all()
    )

def get_video_analytics_summary(db: Session, video_id: int) -> YouTubeAnalyticsSummaryResponse:
    rows = (
        db.query(YouTubeAnalyticsDaily)
        .filter(YouTubeAnalyticsDaily.video_id == video_id)
        .order_by(YouTubeAnalyticsDaily.metric_date.asc())
        .all()
    )

    if not rows:
        return YouTubeAnalyticsSummaryResponse(video_id=video_id)

    latest = rows[-1]
    previous = rows[-2] if len(rows) >= 2 else None

    last_7_rows = rows[-7:]

    views_last_7_days = sum(row.views for row in last_7_rows)
    watch_time_minutes_last_7_days = round(
        sum(row.watch_time_minutes for row in last_7_rows), 2
    )
    subscribers_gained_last_7_days = sum(row.subscribers_gained for row in last_7_rows)

    views_diff_vs_previous_day = (
        latest.views - previous.views if previous else 0
    )
    ctr_diff_vs_previous_day = round(
        latest.impression_click_through_rate - previous.impression_click_through_rate,
        4,
    ) if previous else 0

    return YouTubeAnalyticsSummaryResponse(
        video_id=video_id,
        latest_metric_date=latest.metric_date,
        latest_views=latest.views,
        latest_likes=latest.likes,
        latest_comments=latest.comments,
        latest_average_view_duration_seconds=latest.average_view_duration_seconds,
        latest_watch_time_minutes=latest.watch_time_minutes,
        latest_impressions=latest.impressions,
        latest_impression_click_through_rate=latest.impression_click_through_rate,
        latest_subscribers_gained=latest.subscribers_gained,
        views_last_7_days=views_last_7_days,
        watch_time_minutes_last_7_days=watch_time_minutes_last_7_days,
        subscribers_gained_last_7_days=subscribers_gained_last_7_days,
        views_diff_vs_previous_day=views_diff_vs_previous_day,
        ctr_diff_vs_previous_day=ctr_diff_vs_previous_day,
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