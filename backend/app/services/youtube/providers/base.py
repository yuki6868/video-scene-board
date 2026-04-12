from abc import ABC, abstractmethod


class BaseYouTubeAnalyticsProvider(ABC):
    @abstractmethod
    def fetch_video_daily_metrics(
        self,
        youtube_video_id: str,
        start_date: str,
        end_date: str,
    ) -> list[dict]:
        """
        指定したYouTube動画の日次分析データを返す。
        戻り値はDB保存しやすい共通形式の list[dict] を想定。
        """
        raise NotImplementedError