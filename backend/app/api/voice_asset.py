from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.models.scene import Scene
from app.models.voice_asset import VoiceAsset
from app.schemas.voice_asset import VoiceAssetGenerateRequest, VoiceAssetResponse
from app.services.subtitle_service import generate_subtitle_png
from app.services.voice_service import generate_voice_file


router = APIRouter(prefix="/voice-assets", tags=["voice-assets"])

OUTPUT_BASE_DIR = Path("outputs")


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