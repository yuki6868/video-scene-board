from app.services.youtube.provider_factory import get_youtube_analytics_provider

provider = get_youtube_analytics_provider()
data = provider.fetch_video_daily_metrics("abc123xyz", "2026-04-01", "2026-04-05")
print(data)