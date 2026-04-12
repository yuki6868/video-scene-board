from fastapi import APIRouter, HTTPException, Query, Request

from app.services.youtube.oauth_service import (
    build_authorization_url,
    fetch_token_from_callback_url,
    is_oauth_connected,
    save_credentials,
)

router = APIRouter(prefix="/youtube/auth", tags=["youtube-auth"])

oauth_state_store = {
    "state": None,
    "code_verifier": None,
}


@router.get("/start")
def start_youtube_oauth():
    try:
        authorization_url, state, code_verifier = build_authorization_url()
        oauth_state_store["state"] = state
        oauth_state_store["code_verifier"] = code_verifier

        return {
            "authorization_url": authorization_url,
            "state": state,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/callback")
def youtube_oauth_callback(request: Request, state: str = Query(default="")):
    try:
        expected_state = oauth_state_store.get("state")
        code_verifier = oauth_state_store.get("code_verifier")

        if expected_state and state != expected_state:
            raise HTTPException(status_code=400, detail="OAuth state が一致しません。")

        credentials = fetch_token_from_callback_url(
            callback_url=str(request.url),
            state=expected_state,
            code_verifier=code_verifier,
        )
        save_credentials(credentials)

        oauth_state_store["state"] = None
        oauth_state_store["code_verifier"] = None

        return {
            "message": "YouTube OAuth連携が完了しました。",
            "connected": True,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth連携に失敗しました: {e}")


@router.get("/status")
def youtube_oauth_status():
    return {
        "connected": is_oauth_connected(),
    }