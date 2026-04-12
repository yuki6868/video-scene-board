import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./video_scene_board.db")

YOUTUBE_ANALYTICS_PROVIDER = os.getenv("YOUTUBE_ANALYTICS_PROVIDER", "mock")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://127.0.0.1:8000/youtube/auth/callback",
)

YOUTUBE_OAUTH_SCOPES = [
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/youtube.readonly",
]

YOUTUBE_TOKEN_FILE = os.getenv(
    "YOUTUBE_TOKEN_FILE",
    "outputs/youtube_oauth_token.json",
)