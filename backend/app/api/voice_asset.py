from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.models.voice_asset import VoiceAsset
from app.models.scene import Scene
from app.schemas.voice_asset import VoiceAssetCreate, VoiceAssetResponse

from pathlib import Path

from app.services.voice_service import generate_voice_file
from app.services.subtitle_service import generate_subtitle_png


router = APIRouter(prefix="/voice-assets", tags=["voice-assets"])

OUTPUT_BASE_DIR = Path("outputs")


# =========================
# 生成API
# =========================
@router.post("/generate", response_model=VoiceAssetResponse)
def generate_voice_asset(payload: VoiceAssetCreate, db: Session = Depends(get_db)):

    scene = db.query(Scene).filter(Scene.id == payload.scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    # 音声生成
    voice_result = generate_voice_file(
        text=payload.text,
        style_id=payload.style_id,
        output_dir=OUTPUT_BASE_DIR,
        speed=payload.speed,
        pitch=payload.pitch,
        intonation=payload.intonation,
        volume=payload.volume,
    )

    # 字幕生成
    subtitle_result = generate_subtitle_png(
        text=payload.text,
        style_id=payload.style_id,
        output_dir=OUTPUT_BASE_DIR,
    )

    # DB保存
    voice_asset = VoiceAsset(
        scene_id=payload.scene_id,
        text=payload.text,
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


# =========================
# 一覧取得
# =========================
@router.get("/scene/{scene_id}", response_model=list[VoiceAssetResponse])
def get_voice_assets(scene_id: int, db: Session = Depends(get_db)):

    return (
        db.query(VoiceAsset)
        .filter(VoiceAsset.scene_id == scene_id)
        .order_by(VoiceAsset.created_at.desc())
        .all()
    )


# =========================
# 採用切り替え
# =========================
@router.post("/{voice_asset_id}/select")
def select_voice_asset(voice_asset_id: int, db: Session = Depends(get_db)):

    target = db.query(VoiceAsset).filter(VoiceAsset.id == voice_asset_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="VoiceAsset not found")

    # 同じsceneの選択を全解除
    db.query(VoiceAsset).filter(
        VoiceAsset.scene_id == target.scene_id
    ).update({"is_selected": False})

    target.is_selected = True

    db.commit()

    return {"message": "selected", "id": voice_asset_id}