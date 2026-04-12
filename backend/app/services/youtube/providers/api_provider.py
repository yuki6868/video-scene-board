from googleapiclient.discovery import build
from app.services.youtube.oauth_service import load_credentials


class ApiYouTubeAnalyticsProvider:
    def __init__(self, credentials=None):
        # 渡されなかったら自動でロード
        self.credentials = credentials or load_credentials()

    def fetch_video_daily_metrics(self, youtube_video_id: str, start_date: str, end_date: str):
        service = build("youtubeAnalytics", "v2", credentials=self.credentials)

        response = (
            service.reports()
            .query(
                ids="channel==MINE",
                startDate=start_date,
                endDate=end_date,
                metrics="views,likes,comments,averageViewDuration,estimatedMinutesWatched",
                dimensions="day",
                filters=f"video=={youtube_video_id}",
                sort="day",
            )
            .execute()
        )

        rows = response.get("rows", [])
        headers = [h["name"] for h in response.get("columnHeaders", [])]

        results = []
        for row in rows:
            item = dict(zip(headers, row))

            results.append(
                {
                    # ★ service側に合わせる
                    "youtube_video_id": youtube_video_id,
                    "metric_date": item.get("day"),
                    "views": item.get("views", 0),
                    "likes": item.get("likes", 0),
                    "comments": item.get("comments", 0),
                    "average_view_duration_seconds": item.get("averageViewDuration", 0),
                    "watch_time_minutes": item.get("estimatedMinutesWatched", 0),
                    "impressions": 0,
                    "impression_click_through_rate": 0,
                    "subscribers_gained": 0,
                    "data_source": "api",
                }
            )

        return results