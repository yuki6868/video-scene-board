import os

from app.services.youtube.providers.mock_provider import MockYouTubeAnalyticsProvider
from app.services.youtube.providers.api_provider import ApiYouTubeAnalyticsProvider


def get_youtube_analytics_provider(provider_name: str | None = None):
    resolved_name = (
        provider_name
        or os.getenv("YOUTUBE_ANALYTICS_PROVIDER", "mock")
    ).lower()

    if resolved_name == "api":
        return ApiYouTubeAnalyticsProvider()

    return MockYouTubeAnalyticsProvider()