from collections import defaultdict
from googleapiclient.discovery import build
from app.services.youtube.oauth_service import load_credentials


class ApiYouTubeAnalyticsProvider:
    def __init__(self, credentials=None):
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

    def fetch_video_audience_summary(self, youtube_video_id: str, start_date: str, end_date: str):
        service = build("youtubeAnalytics", "v2", credentials=self.credentials)

        response = (
            service.reports()
            .query(
                ids="channel==MINE",
                startDate=start_date,
                endDate=end_date,
                metrics="viewerPercentage",
                dimensions="ageGroup,gender",
                filters=f"video=={youtube_video_id}",
                sort="gender,ageGroup",
            )
            .execute()
        )

        rows = response.get("rows", [])
        headers = [h["name"] for h in response.get("columnHeaders", [])]

        male = 0.0
        female = 0.0
        other = 0.0

        age_map = defaultdict(float)

        for row in rows:
            item = dict(zip(headers, row))
            age_group = item.get("ageGroup")
            gender = item.get("gender")
            viewer_percentage = float(item.get("viewerPercentage", 0))

            if gender == "male":
                male += viewer_percentage
            elif gender == "female":
                female += viewer_percentage
            else:
                other += viewer_percentage

            age_map[age_group] += viewer_percentage

        return {
            "metric_date": end_date,
            "gender_ratio": {
                "male": round(male, 2),
                "female": round(female, 2),
                "other": round(other, 2),
            },
            "age_distribution": {
                "age_13_17": round(age_map.get("age13-17", 0), 2),
                "age_18_24": round(age_map.get("age18-24", 0), 2),
                "age_25_34": round(age_map.get("age25-34", 0), 2),
                "age_35_44": round(age_map.get("age35-44", 0), 2),
                "age_45_54": round(age_map.get("age45-54", 0), 2),
                "age_55_64": round(age_map.get("age55-64", 0), 2),
                "age_65_plus": round(age_map.get("age65-", 0), 2),
            },
            "data_source": "api",
        }