from pathlib import Path
import re

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.models.scene import Scene
from app.models.voice_asset import VoiceAsset
from app.schemas.voice_asset import VoiceAssetGenerateRequest, VoiceAssetResponse
from app.services.subtitle_service import generate_subtitle_png
from app.services.voice_service import generate_voice_file


router = APIRouter(prefix="/voice-assets", tags=["voice-assets"])

OUTPUT_BASE_DIR = Path("outputs")
BACKEND_DIR = Path(__file__).resolve().parents[2]
OUTPUT_DIR = (BACKEND_DIR / "outputs").resolve()


def _safe_download_name(text: str | None, fallback: str) -> str:
    base = (text or "").strip()
    if not base:
        return fallback
    base = re.sub(r'[\\/:*?"<>|]+', "_", base)
    base = re.sub(r"\s+", "_", base)
    return base[:30] or fallback


def _resolve_output_file(path_str: str | None) -> Path:
    if not path_str:
        raise HTTPException(status_code=404, detail="ファイルパスがありません")

    raw_path = Path(path_str)

    if raw_path.is_absolute():
        resolved = raw_path.resolve()
    else:
        resolved = (BACKEND_DIR / raw_path).resolve()

    if not str(resolved).startswith(str(OUTPUT_DIR)):
        raise HTTPException(status_code=400, detail="outputs配下のファイルのみ取得できます")

    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")

    return resolved


@router.get("/{voice_asset_id}/download/audio")
def download_voice_audio(voice_asset_id: int, db: Session = Depends(get_db)):
    voice_asset = db.query(VoiceAsset).filter(VoiceAsset.id == voice_asset_id).first()
    if not voice_asset:
        raise HTTPException(status_code=404, detail="VoiceAsset not found")

    file_path = _resolve_output_file(voice_asset.audio_path)
    safe_name = _safe_download_name(
        voice_asset.voice_text or voice_asset.text,
        f"voice_asset_{voice_asset_id}",
    )

    return FileResponse(
        path=file_path,
        filename=f"scene_{voice_asset.scene_id}_{safe_name}.wav",
        media_type="audio/wav",
    )


@router.get("/{voice_asset_id}/download/subtitle")
def download_voice_subtitle(voice_asset_id: int, db: Session = Depends(get_db)):
    voice_asset = db.query(VoiceAsset).filter(VoiceAsset.id == voice_asset_id).first()
    if not voice_asset:
        raise HTTPException(status_code=404, detail="VoiceAsset not found")

    file_path = _resolve_output_file(voice_asset.subtitle_png_path)
    safe_name = _safe_download_name(
        voice_asset.subtitle_text or voice_asset.text,
        f"subtitle_asset_{voice_asset_id}",
    )

    return FileResponse(
        path=file_path,
        filename=f"scene_{voice_asset.scene_id}_{safe_name}.png",
        media_type="image/png",
    )


@router.post("/generate", response_model=VoiceAssetResponse)
def generate_voice_asset(payload: VoiceAssetGenerateRequest, db: Session = Depends(get_db)):
    scene = db.query(Scene).filter(Scene.id == payload.scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    voice_text = (
        payload.voice_text
        or scene.voice_text
        or payload.text
        or scene.script
        or ""
    ).strip()

    subtitle_text = (
        payload.subtitle_text
        or scene.subtitle_text
        or scene.telop
        or payload.text
        or scene.script
        or ""
    ).strip()

    if not voice_text:
        raise HTTPException(status_code=400, detail="voice_text is required")

    if not subtitle_text:
        raise HTTPException(status_code=400, detail="subtitle_text is required")

    voice_result = generate_voice_file(
        text=voice_text,
        style_id=payload.style_id,
        output_dir=OUTPUT_BASE_DIR,
        speed=payload.speed,
        pitch=payload.pitch,
        intonation=payload.intonation,
        volume=payload.volume,
    )

    subtitle_result = generate_subtitle_png(
        text=subtitle_text,
        style_id=payload.style_id,
        output_dir=OUTPUT_BASE_DIR,
    )

    voice_asset = VoiceAsset(
        scene_id=payload.scene_id,
        text=voice_text,
        voice_text=voice_text,
        subtitle_text=subtitle_text,
        style_id=payload.style_id,
        character_name=voice_result["character"],
        style_name=voice_result["style"],
        speed=payload.speed,
        pitch=payload.pitch,
        intonation=payload.intonation,
        volume=payload.volume,
        audio_path=voice_result["file_path"],
        subtitle_png_path=subtitle_result["file_path"],
        is_selected=False,
    )

    db.add(voice_asset)
    db.commit()
    db.refresh(voice_asset)

    return voice_asset


@router.get("/scene/{scene_id}", response_model=list[VoiceAssetResponse])
def get_voice_assets(scene_id: int, db: Session = Depends(get_db)):
    return (
        db.query(VoiceAsset)
        .filter(VoiceAsset.scene_id == scene_id)
        .order_by(VoiceAsset.created_at.desc())
        .all()
    )


@router.post("/{voice_asset_id}/select")
def select_voice_asset(voice_asset_id: int, db: Session = Depends(get_db)):
    target = db.query(VoiceAsset).filter(VoiceAsset.id == voice_asset_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="VoiceAsset not found")

    db.query(VoiceAsset).filter(
        VoiceAsset.scene_id == target.scene_id
    ).update({"is_selected": False})

    target.is_selected = True

    scene = db.query(Scene).filter(Scene.id == target.scene_id).first()

    if scene:
        scene.audio_path = target.audio_path
        if target.voice_text:
            scene.voice_text = target.voice_text
        if target.subtitle_text:
            scene.subtitle_text = target.subtitle_text

    db.commit()

    if scene:
        db.refresh(scene)

    return {
        "message": "selected",
        "id": voice_asset_id,
        "scene": scene,
    }