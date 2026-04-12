import os

from app.services.youtube.providers.mock_provider import MockYouTubeAnalyticsProvider
from app.services.youtube.providers.api_provider import ApiYouTubeAnalyticsProvider


def get_youtube_analytics_provider():
    provider_name = os.getenv("YOUTUBE_ANALYTICS_PROVIDER", "mock").lower()

    if provider_name == "api":
        return ApiYouTubeAnalyticsProvider()

    return MockYouTubeAnalyticsProvider()