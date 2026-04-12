from app.services.youtube.providers.api_provider import ApiYouTubeAnalyticsProvider
from app.services.youtube.providers.mock_provider import MockYouTubeAnalyticsProvider


def get_youtube_analytics_provider(source, credentials=None):
    if source == "api":
        return ApiYouTubeAnalyticsProvider(credentials)
    else:
        return MockYouTubeAnalyticsProvider()