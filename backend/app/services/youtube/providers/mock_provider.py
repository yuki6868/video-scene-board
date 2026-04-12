from datetime import datetime, timedelta
import math

from app.services.youtube.providers.base import BaseYouTubeAnalyticsProvider


class MockYouTubeAnalyticsProvider(BaseYouTubeAnalyticsProvider):
    def fetch_video_daily_metrics(self, youtube_video_id: str, start_date: str, end_date: str):
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)

        results = []
        current = start
        day_index = 0

        while current <= end:
            views = int(120 + day_index * 18 + abs(math.sin(day_index)) * 40)
            likes = int(10 + day_index * 2 + abs(math.cos(day_index)) * 3)
            comments = int(2 + day_index // 2)
            average_view_duration_seconds = 42 + day_index * 1.5
            watch_time_minutes = round(views * average_view_duration_seconds / 60, 2)
            impressions = int(views * 8)
            impression_click_through_rate = 0.03 + (day_index % 5) * 0.002
            subscribers_gained = max(0, day_index // 3)

            results.append(
                {
                    "youtube_video_id": youtube_video_id,
                    "metric_date": current.date().isoformat(),
                    "views": views,
                    "likes": likes,
                    "comments": comments,
                    "average_view_duration_seconds": average_view_duration_seconds,
                    "watch_time_minutes": watch_time_minutes,
                    "impressions": impressions,
                    "impression_click_through_rate": impression_click_through_rate,
                    "subscribers_gained": subscribers_gained,
                    "data_source": "mock",
                }
            )

            current += timedelta(days=1)
            day_index += 1

        return results

    def fetch_video_audience_summary(
        self,
        youtube_video_id: str,
        start_date: str,
        end_date: str,
    ) -> dict:
        return {
            "metric_date": end_date,
            "gender_ratio": {
                "male": 62,
                "female": 34,
                "other": 4,
            },
            "age_distribution": {
                "age_13_17": 8,
                "age_18_24": 26,
                "age_25_34": 31,
                "age_35_44": 19,
                "age_45_54": 10,
                "age_55_64": 4,
                "age_65_plus": 2,
            },
            "data_source": "mock",
        }