from abc import ABC, abstractmethod


class BaseYouTubeAnalyticsProvider(ABC):
    @abstractmethod
    def fetch_video_daily_metrics(
        self,
        youtube_video_id: str,
        start_date: str,
        end_date: str,
    ) -> list[dict]:
        raise NotImplementedError

    @abstractmethod
    def fetch_video_audience_summary(
        self,
        youtube_video_id: str,
        start_date: str,
        end_date: str,
    ) -> dict:
        raise NotImplementedError