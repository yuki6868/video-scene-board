import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.scene import Scene
from app.models.video import Video
from app.models.voice_asset import VoiceAsset

import shutil
import zipfile
import csv


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

def _safe_copy(src_path: str | None, dest_dir: Path, prefix: str) -> str | None:
    if not src_path:
        return None

    src = Path(src_path)

    if not src.exists():
        return None

    dest_dir.mkdir(parents=True, exist_ok=True)

    dest_path = dest_dir / f"{prefix}_{src.name}"

    shutil.copy2(src, dest_path)

    return dest_path.as_posix()

def create_davinci_scenes_csv(manifest: dict, export_dir: Path) -> str:
    csv_path = export_dir / "scenes.csv"

    fieldnames = [
        "scene_id",
        "position",
        "title",
        "status",
        "section_type",
        "duration_seconds",
        "background_path",
        "audio_path",
        "se_path",
        "script",
        "telop",
    ]

    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for scene in manifest.get("scenes", []):
            writer.writerow(
                {
                    "scene_id": scene.get("scene_id"),
                    "position": scene.get("position"),
                    "title": scene.get("title"),
                    "status": scene.get("status"),
                    "section_type": scene.get("section_type"),
                    "duration_seconds": scene.get("duration_seconds"),
                    "background_path": scene.get("background_path"),
                    "audio_path": scene.get("audio_path"),
                    "se_path": scene.get("se_path"),
                    "script": scene.get("script"),
                    "telop": scene.get("telop"),
                }
            )

    return csv_path.as_posix()

def export_davinci_manifest(db: Session, video_id: int) -> dict:
    manifest = build_davinci_manifest(db, video_id)

    export_dir = EXPORT_BASE_DIR / f"video_{video_id}"
    assets_dir = export_dir / "assets"
    audio_dir = export_dir / "audio"

    export_dir.mkdir(parents=True, exist_ok=True)
    assets_dir.mkdir(parents=True, exist_ok=True)
    audio_dir.mkdir(parents=True, exist_ok=True)

    missing_files = []

    # --- scenes ---
    for scene in manifest["scenes"]:
        # 背景
        bg = scene.get("background_path")
        copied_bg = _safe_copy(bg, assets_dir, f"scene_{scene['scene_id']}_bg")
        if bg and not copied_bg:
            missing_files.append(bg)
        scene["background_path"] = copied_bg

        # SE
        se = scene.get("se_path")
        copied_se = _safe_copy(se, audio_dir, f"scene_{scene['scene_id']}_se")
        if se and not copied_se:
            missing_files.append(se)
        scene["se_path"] = copied_se

        # 音声
        audio = scene.get("audio_path")
        copied_audio = _safe_copy(audio, audio_dir, f"scene_{scene['scene_id']}_voice")
        if audio and not copied_audio:
            missing_files.append(audio)
        scene["audio_path"] = copied_audio

    # --- assets ---
    for asset in manifest["assets"]:
        path = asset.get("path_or_url")

        copied = _safe_copy(path, assets_dir, f"asset_{asset['asset_id']}")
        if path and not copied:
            missing_files.append(path)

        asset["path_or_url"] = copied

    # --- voice assets ---
    for voice in manifest["voice_assets"]:
        audio = voice.get("audio_path")
        copied_audio = _safe_copy(audio, audio_dir, f"voice_{voice['voice_asset_id']}")

        if audio and not copied_audio:
            missing_files.append(audio)

        voice["audio_path"] = copied_audio

    # missing追加
    manifest["missing_files"] = missing_files

    csv_path = create_davinci_scenes_csv(manifest, export_dir)
    manifest["scenes_csv_path"] = csv_path

    # 保存
    manifest_path = export_dir / "manifest.json"

    with manifest_path.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    return {
        "message": "DaVinci export with assets created",
        "video_id": video_id,
        "export_dir": export_dir.as_posix(),
        "manifest_path": manifest_path.as_posix(),
        "csv_path": csv_path,
        "missing_files": missing_files,
    }

def create_davinci_export_zip(video_id: int) -> dict:
    export_dir = EXPORT_BASE_DIR / f"video_{video_id}"
    if not export_dir.exists():
        raise FileNotFoundError("Export directory not found")

    zip_path = EXPORT_BASE_DIR / f"video_{video_id}.zip"

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for file_path in export_dir.rglob("*"):
            if file_path.is_file():
                arcname = file_path.relative_to(export_dir.parent)
                zipf.write(file_path, arcname.as_posix())

    return {
        "video_id": video_id,
        "zip_path": zip_path.as_posix(),
        "zip_name": zip_path.name,
    }