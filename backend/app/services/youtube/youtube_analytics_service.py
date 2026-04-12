from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.video import Video
from app.models.youtube_analytics_daily import YouTubeAnalyticsDaily
from app.services.youtube.provider_factory import get_youtube_analytics_provider
from app.schemas.youtube_analytics import (
    YouTubeAnalyticsSummaryResponse,
    YouTubeAudienceSummaryResponse,
)


def get_video_analytics_daily(db: Session, video_id: int) -> list[YouTubeAnalyticsDaily]:
    return (
        db.query(YouTubeAnalyticsDaily)
        .filter(YouTubeAnalyticsDaily.video_id == video_id)
        .order_by(YouTubeAnalyticsDaily.metric_date.asc())
        .all()
    )


def get_video_analytics_summary(db: Session, video_id: int) -> YouTubeAnalyticsSummaryResponse:
    daily_items = (
        db.query(YouTubeAnalyticsDaily)
        .filter(YouTubeAnalyticsDaily.video_id == video_id)
        .order_by(YouTubeAnalyticsDaily.metric_date.asc())
        .all()
    )

    if not daily_items:
        return YouTubeAnalyticsSummaryResponse(video_id=video_id)

    latest = daily_items[-1]
    previous = daily_items[-2] if len(daily_items) >= 2 else None
    last_7_days = daily_items[-7:]

    return YouTubeAnalyticsSummaryResponse(
        video_id=video_id,
        latest_metric_date=latest.metric_date,
        latest_views=latest.views or 0,
        latest_likes=latest.likes or 0,
        latest_comments=latest.comments or 0,
        latest_average_view_duration_seconds=latest.average_view_duration_seconds or 0,
        latest_watch_time_minutes=latest.watch_time_minutes or 0,
        latest_impressions=latest.impressions or 0,
        latest_impression_click_through_rate=latest.impression_click_through_rate or 0,
        latest_subscribers_gained=latest.subscribers_gained or 0,
        views_last_7_days=sum(item.views or 0 for item in last_7_days),
        watch_time_minutes_last_7_days=sum(
            item.watch_time_minutes or 0 for item in last_7_days
        ),
        subscribers_gained_last_7_days=sum(
            item.subscribers_gained or 0 for item in last_7_days
        ),
        views_diff_vs_previous_day=(latest.views or 0)
        - ((previous.views or 0) if previous else 0),
        ctr_diff_vs_previous_day=(latest.impression_click_through_rate or 0)
        - ((previous.impression_click_through_rate or 0) if previous else 0),
    )


def get_video_audience_summary(db: Session, video_id: int) -> YouTubeAudienceSummaryResponse:
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise ValueError("動画が見つかりません。")

    if not video.youtube_id:
        raise ValueError("YouTube ID が設定されていません。")

    current_source = "api" if getattr(video, "analytics_source", None) == "api" else "mock"

    provider = get_youtube_analytics_provider(current_source)

    end_date = date.today()
    start_date = end_date - timedelta(days=27)

    result = provider.fetch_video_audience_summary(
        youtube_video_id=video.youtube_id,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
    )

    return YouTubeAudienceSummaryResponse(
        video_id=video.id,
        metric_date=result.get("metric_date"),
        gender_ratio=result.get("gender_ratio", {}),
        age_distribution=result.get("age_distribution", {}),
        data_source=result.get("data_source", current_source),
    )


def sync_video_analytics_daily(db: Session, video_id: int) -> list[YouTubeAnalyticsDaily]:
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise ValueError("動画が見つかりません。")

    if not video.youtube_id:
        raise ValueError("YouTube ID が設定されていません。")

    current_source = "api" if getattr(video, "analytics_source", None) == "api" else "mock"

    # 既存データに別ソースが混ざっていたら丸ごと削除して混在を防ぐ
    existing_sources = {
        row[0]
        for row in db.query(YouTubeAnalyticsDaily.data_source)
        .filter(YouTubeAnalyticsDaily.video_id == video.id)
        .distinct()
        .all()
        if row[0]
    }

    if existing_sources and existing_sources != {current_source}:
        db.query(YouTubeAnalyticsDaily).filter(
            YouTubeAnalyticsDaily.video_id == video.id
        ).delete(synchronize_session=False)
        db.commit()

    provider = get_youtube_analytics_provider(current_source)

    # 今は直近7日を同期
    end_date = date.today()
    start_date = end_date - timedelta(days=6)

    metrics = provider.fetch_video_daily_metrics(
        youtube_video_id=video.youtube_id,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
    )

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
            existing.data_source = current_source
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
                data_source=current_source,
            )
            db.add(row)

    db.commit()

    return (
        db.query(YouTubeAnalyticsDaily)
        .filter(YouTubeAnalyticsDaily.video_id == video.id)
        .order_by(YouTubeAnalyticsDaily.metric_date.asc())
        .all()
    )