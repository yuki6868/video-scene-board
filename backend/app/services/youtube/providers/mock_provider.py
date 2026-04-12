from datetime import datetime, timedelta
import math

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

        total_days = (end - start).days + 1
        if total_days <= 0:
            return []

        # 動画ごとの差を少し出すための固定シード的な値
        video_seed = sum(ord(c) for c in youtube_video_id) % 97

        # 初動の強さ
        initial_boost = 1.2 + (video_seed % 5) * 0.18

        # ベース再生数
        base_views = 180 + video_seed * 7

        results = []

        for day_index in range(total_days):
            current = start + timedelta(days=day_index)

            # 初動が強く、徐々になだらかになる形
            growth_curve = (
                base_views
                + 420 * math.exp(-day_index / 2.8) * initial_boost
                + 35 * math.log(day_index + 1)
            )

            # 曜日や日ごとのちょい揺れを再現
            fluctuation = 1 + 0.08 * math.sin(day_index + video_seed / 10)

            views = max(50, int(growth_curve * fluctuation))

            # CTRは初期高め → 徐々に安定、少しだけ上下
            ctr = 0.038 + 0.02 * math.exp(-day_index / 3.5) + 0.004 * math.sin(day_index / 1.8)
            ctr = max(0.02, min(0.12, ctr))

            impressions = int(views / ctr)

            # エンゲージメントを再生数ベースで自然に作る
            likes = max(0, int(views * (0.035 + (video_seed % 4) * 0.003)))
            comments = max(0, int(views * (0.004 + (day_index % 3) * 0.0008)))

            average_view_duration_seconds = round(
                28
                + (video_seed % 12)
                + 8 * math.exp(-day_index / 5)
                + 2 * math.sin(day_index / 2),
                2,
            )

            watch_time_minutes = round(
                views * average_view_duration_seconds / 60,
                2,
            )

            subscribers_gained = max(
                0,
                int(views * (0.0015 + (video_seed % 3) * 0.0004))
            )

            results.append(
                {
                    "youtube_video_id": youtube_video_id,
                    "metric_date": current.isoformat(),
                    "views": views,
                    "likes": likes,
                    "comments": comments,
                    "average_view_duration_seconds": average_view_duration_seconds,
                    "watch_time_minutes": watch_time_minutes,
                    "impressions": impressions,
                    "impression_click_through_rate": round(ctr, 4),
                    "subscribers_gained": subscribers_gained,
                    "data_source": "mock",
                }
            )

        return results