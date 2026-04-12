import base64
import hashlib
import json
import os
import secrets
from pathlib import Path

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials

from app.core.config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    YOUTUBE_OAUTH_SCOPES,
    YOUTUBE_TOKEN_FILE,
)


def _build_client_config() -> dict:
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise ValueError(
            "Google OAuth設定が不足しています。.env に GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET を設定してください。"
        )

    return {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_REDIRECT_URI],
        }
    }


def generate_code_verifier() -> str:
    # PKCE 用。43〜128文字が必要
    # secrets.token_urlsafe(64) なら十分長い
    verifier = secrets.token_urlsafe(64)
    return verifier[:128]


def create_oauth_flow(
    *,
    state: str | None = None,
    code_verifier: str | None = None,
) -> Flow:
    client_config = _build_client_config()

    flow = Flow.from_client_config(
        client_config=client_config,
        scopes=YOUTUBE_OAUTH_SCOPES,
        state=state,
        code_verifier=code_verifier,
        autogenerate_code_verifier=False,
    )
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    return flow


def build_authorization_url() -> tuple[str, str, str]:
    code_verifier = generate_code_verifier()
    flow = create_oauth_flow(code_verifier=code_verifier)

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    return authorization_url, state, code_verifier


def fetch_token_from_callback_url(
    callback_url: str,
    *,
    state: str | None = None,
    code_verifier: str | None = None,
) -> Credentials:
    flow = create_oauth_flow(
        state=state,
        code_verifier=code_verifier,
    )

    # ローカルHTTPで受けても oauthlib 向けには https に置換して渡す
    normalized_callback_url = callback_url.replace("http://", "https://", 1)

    flow.fetch_token(authorization_response=normalized_callback_url)
    return flow.credentials


def save_credentials(credentials: Credentials) -> None:
    token_path = Path(YOUTUBE_TOKEN_FILE)
    token_path.parent.mkdir(parents=True, exist_ok=True)
    token_path.write_text(credentials.to_json(), encoding="utf-8")


def load_credentials() -> Credentials | None:
    token_path = Path(YOUTUBE_TOKEN_FILE)
    if not token_path.exists():
        return None

    data = json.loads(token_path.read_text(encoding="utf-8"))
    return Credentials.from_authorized_user_info(data, scopes=YOUTUBE_OAUTH_SCOPES)


def is_oauth_connected() -> bool:
    creds = load_credentials()
    return creds is not None and bool(creds.refresh_token or creds.token)