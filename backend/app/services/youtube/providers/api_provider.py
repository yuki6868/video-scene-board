from app.services.youtube.providers.base import BaseYouTubeAnalyticsProvider


class ApiYouTubeAnalyticsProvider(BaseYouTubeAnalyticsProvider):
    def fetch_video_daily_metrics(
        self,
        youtube_video_id: str,
        start_date: str,
        end_date: str,
    ) -> list[dict]:
        raise ValueError(
            "実APIモードが選択されていますが、YouTube Analytics API連携はまだ未実装です。"
        )