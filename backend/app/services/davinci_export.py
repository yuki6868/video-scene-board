import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.scene import Scene
from app.models.video import Video
from app.models.voice_asset import VoiceAsset


EXPORT_BASE_DIR = Path("exports")


def _to_posix_path(value: str | None) -> str | None:
    if not value:
        return None
    return Path(value).as_posix()


def build_davinci_manifest(db: Session, video_id: int) -> dict:
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise ValueError("Video not found")

    scenes = (
        db.query(Scene)
        .filter(Scene.video_id == video_id)
        .order_by(Scene.position.asc(), Scene.id.asc())
        .all()
    )

    assets = (
        db.query(Asset)
        .filter(Asset.video_id == video_id)
        .order_by(Asset.id.asc())
        .all()
    )

    selected_voice_assets = (
        db.query(VoiceAsset)
        .join(Scene, Scene.id == VoiceAsset.scene_id)
        .filter(Scene.video_id == video_id, VoiceAsset.is_selected.is_(True))
        .order_by(Scene.position.asc(), VoiceAsset.id.asc())
        .all()
    )

    selected_voice_map = {voice.scene_id: voice for voice in selected_voice_assets}

    scene_items = []
    for scene in scenes:
        selected_voice = selected_voice_map.get(scene.id)

        scene_items.append(
            {
                "scene_id": scene.id,
                "position": scene.position,
                "title": scene.title,
                "section_type": scene.section_type,
                "status": scene.status,
                "duration_seconds": scene.duration_seconds,
                "script": scene.script,
                "materials": scene.materials,
                "telop": scene.telop,
                "direction": scene.direction,
                "edit_note": scene.edit_note,
                "character_name": scene.character_name,
                "character_expression": scene.character_expression,
                "background_path": _to_posix_path(scene.background_path),
                "se_path": _to_posix_path(scene.se_path),
                "audio_path": _to_posix_path(
                    selected_voice.audio_path if selected_voice else scene.audio_path
                ),
                "selected_voice_asset": (
                    {
                        "voice_asset_id": selected_voice.id,
                        "character_name": selected_voice.character_name,
                        "style_id": selected_voice.style_id,
                        "style_name": selected_voice.style_name,
                        "text": selected_voice.text,
                        "speed": selected_voice.speed,
                        "pitch": selected_voice.pitch,
                        "intonation": selected_voice.intonation,
                        "volume": selected_voice.volume,
                        "audio_path": _to_posix_path(selected_voice.audio_path),
                        "subtitle_png_path": _to_posix_path(selected_voice.subtitle_png_path),
                    }
                    if selected_voice
                    else None
                ),
            }
        )

    asset_items = []
    for asset in assets:
        asset_items.append(
            {
                "asset_id": asset.id,
                "scene_id": asset.scene_id,
                "asset_type": asset.asset_type,
                "title": asset.title,
                "status": asset.status,
                "location_type": asset.location_type,
                "path_or_url": _to_posix_path(asset.path_or_url),
                "relative_path": _to_posix_path(asset.relative_path),
                "source_note": asset.source_note,
                "search_keyword": asset.search_keyword,
                "memo": asset.memo,
            }
        )

    voice_asset_items = []
    for voice in selected_voice_assets:
        voice_asset_items.append(
            {
                "voice_asset_id": voice.id,
                "scene_id": voice.scene_id,
                "character_name": voice.character_name,
                "style_id": voice.style_id,
                "style_name": voice.style_name,
                "text": voice.text,
                "speed": voice.speed,
                "pitch": voice.pitch,
                "intonation": voice.intonation,
                "volume": voice.volume,
                "audio_path": _to_posix_path(voice.audio_path),
                "subtitle_png_path": _to_posix_path(voice.subtitle_png_path),
                "is_selected": voice.is_selected,
            }
        )

    manifest = {
        "export_type": "davinci",
        "video": {
            "id": video.id,
            "title": video.title,
            "description": video.description,
            "tags": video.tags,
            "video_path": _to_posix_path(video.video_path),
            "youtube_url": video.youtube_url,
            "youtube_id": video.youtube_id,
            "published_at": video.published_at.isoformat() if video.published_at else None,
            "concept": video.concept,
            "target": video.target,
            "goal": video.goal,
            "status": video.status,
            "created_at": video.created_at.isoformat() if video.created_at else None,
            "updated_at": video.updated_at.isoformat() if video.updated_at else None,
        },
        "scene_count": len(scene_items),
        "asset_count": len(asset_items),
        "voice_asset_count": len(voice_asset_items),
        "scenes": scene_items,
        "assets": asset_items,
        "voice_assets": voice_asset_items,
    }

    return manifest


def export_davinci_manifest(db: Session, video_id: int) -> dict:
    manifest = build_davinci_manifest(db, video_id)

    export_dir = EXPORT_BASE_DIR / f"video_{video_id}"
    export_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = export_dir / "manifest.json"

    with manifest_path.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    return {
        "message": "DaVinci export manifest created",
        "video_id": video_id,
        "export_dir": export_dir.as_posix(),
        "manifest_path": manifest_path.as_posix(),
        "manifest": manifest,
    }