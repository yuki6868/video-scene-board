from datetime import datetime, timedelta

from app.services.youtube.providers.base import BaseYouTubeAnalyticsProvider


class MockYouTubeAnalyticsProvider(BaseYouTubeAnalyticsProvider):
    def fetch_video_daily_metrics(
        self,
        youtube_video_id: str,
        start_date: str,
        end_date: str,
    ) -> list[dict]:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()

        results = []
        current = start
        day_index = 0

        while current <= end:
            views = 120 + day_index * 35
            likes = 8 + day_index * 2
            comments = 1 + (day_index // 2)
            avg_view_duration = 32 + (day_index % 5)
            watch_time_minutes = views * avg_view_duration / 60
            impressions = 900 + day_index * 120
            ctr = 0.045 + (day_index % 4) * 0.002
            subscribers_gained = 1 if day_index % 3 == 0 else 0

            results.append(
                {
                    "youtube_video_id": youtube_video_id,
                    "metric_date": current.isoformat(),
                    "views": views,
                    "likes": likes,
                    "comments": comments,
                    "average_view_duration_seconds": round(avg_view_duration, 2),
                    "watch_time_minutes": round(watch_time_minutes, 2),
                    "impressions": impressions,
                    "impression_click_through_rate": round(ctr, 4),
                    "subscribers_gained": subscribers_gained,
                    "data_source": "mock",
                }
            )

            current += timedelta(days=1)
            day_index += 1

        return results