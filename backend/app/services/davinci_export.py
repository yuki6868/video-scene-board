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
import xml.etree.ElementTree as ET
import subprocess
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime
import json
import re


EXPORT_BASE_DIR = Path("exports")
BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _sanitize_export_name(export_name: str | None) -> str | None:
    if not export_name:
        return None

    value = export_name.strip()
    if not value:
        return None

    # ファイル名として危険な文字を置換
    value = re.sub(r'[\\/:*?"<>|]', "_", value)
    # 空白を _ にまとめる
    value = re.sub(r"\s+", "_", value)
    # _ の連続を1つに
    value = re.sub(r"_+", "_", value)
    value = value.strip("._")

    return value or None


def _build_export_dir(video_id: int, export_name: str | None) -> Path:
    safe_name = _sanitize_export_name(export_name)

    if not safe_name:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return EXPORT_BASE_DIR / f"video_{video_id}_{timestamp}"

    base_dir = EXPORT_BASE_DIR / f"video_{video_id}_{safe_name}"

    if not base_dir.exists():
        return base_dir

    suffix = 2
    while True:
        candidate = EXPORT_BASE_DIR / f"video_{video_id}_{safe_name}_{suffix}"
        if not candidate.exists():
            return candidate
        suffix += 1


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

def generate_bg_video(image_path: str, output_path: Path, duration: int = 5):
    output_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg",
        "-y",
        "-loop", "1",
        "-i", image_path,
        "-t", str(duration),
        "-vf", "scale=1920:1080,format=yuv420p",
        "-r", "30",
        "-pix_fmt", "yuv420p",
        "-c:v", "libx264",
        str(output_path),
    ]

    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def generate_telop_image(text: str, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)

    img = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc", 80)
    except:
        font = ImageFont.load_default()

    text_width, text_height = draw.textsize(text, font=font)

    x = (1920 - text_width) // 2
    y = 800

    # 黒縁
    for dx in [-3, 3]:
        for dy in [-3, 3]:
            draw.text((x+dx, y+dy), text, font=font, fill=(0, 0, 0, 255))

    # 本体
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))

    img.save(output_path)

def generate_telop_video(image_path: str, output_path: Path, duration: int):
    output_path.parent.mkdir(parents=True, exist_ok=True)

    mov_output = output_path.with_suffix(".mov")

    cmd = [
        "ffmpeg",
        "-y",
        "-loop", "1",
        "-i", image_path,
        "-t", str(duration),
        "-r", "30",
        "-c:v", "prores_ks",
        "-profile:v", "4444",
        "-pix_fmt", "yuva444p10le",
        str(mov_output),
    ]

    subprocess.run(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True,
    )

    return mov_output.as_posix()

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

def _to_file_uri(path_str: str, base_dir: Path) -> str:
    path = Path(path_str)

    if path.is_absolute():
        return path.resolve().as_uri()

    # "exports/..." で始まる場合は backend ルート基準で解決
    if path.parts and path.parts[0] == EXPORT_BASE_DIR.name:
        return (BACKEND_ROOT / path).resolve().as_uri()

    # それ以外は export_dir 基準で解決
    if not base_dir.is_absolute():
        base_dir = (BACKEND_ROOT / base_dir).resolve()

    return (base_dir / path).resolve().as_uri()


def _seconds_to_fcpx_time(seconds: float, fps: int = 30) -> str:
    frames = max(1, int(round(seconds * fps)))
    return f"{frames}/{fps}s"

def _is_supported_image_file(path_str: str | None) -> bool:
    if not path_str:
        return False

    suffix = Path(path_str).suffix.lower()
    return suffix in {".png", ".jpg", ".jpeg", ".webp"}


def create_fcpxml(manifest: dict, export_dir: Path) -> str:
    xml_path = export_dir / "timeline.fcpxml"

    fps = 30
    scene_assets = []
    total_seconds = 0

    for scene in manifest.get("scenes", []):
        duration_seconds = scene.get("duration_seconds") or 5
        total_seconds += duration_seconds

        scene_assets.append(
            {
                "title": scene.get("title") or "scene",
                "audio_path": scene.get("audio_path"),
                "bg_video_path": scene.get("bg_video_path"),
                "telop_video_path": scene.get("telop_video_path"),
                "duration_seconds": duration_seconds,
            }
        )

    total_duration = _seconds_to_fcpx_time(total_seconds or 1, fps)

    fcpxml = ET.Element("fcpxml", version="1.11")
    resources = ET.SubElement(fcpxml, "resources")

    ET.SubElement(
        resources,
        "format",
        id="r1",
        name="FFVideoFormat1080p30",
        frameDuration="1/30s",
        width="1920",
        height="1080",
        colorSpace="1-1-1 (Rec. 709)",
    )

    resource_index = 2

    for scene in scene_assets:
        duration = _seconds_to_fcpx_time(scene["duration_seconds"], fps)

        scene["bg_id"] = None
        scene["audio_id"] = None
        scene["telop_id"] = None

        if scene.get("bg_video_path"):
            scene["bg_id"] = f"r{resource_index}"
            resource_index += 1

            ET.SubElement(
                resources,
                "asset",
                id=scene["bg_id"],
                name=f"{scene['title']}_bg",
                src=_to_file_uri(scene["bg_video_path"], export_dir),
                start="0s",
                duration=duration,
                hasVideo="1",
                hasAudio="0",
                format="r1",
            )

        if scene.get("audio_path"):
            scene["audio_id"] = f"r{resource_index}"
            resource_index += 1

            ET.SubElement(
                resources,
                "asset",
                id=scene["audio_id"],
                name=f"{scene['title']}_audio",
                src=_to_file_uri(scene["audio_path"], export_dir),
                start="0s",
                duration=duration,
                hasVideo="0",
                hasAudio="1",
                audioSources="1",
                audioChannels="2",
                audioRate="48k",
            )

        if scene.get("telop_video_path"):
            scene["telop_id"] = f"r{resource_index}"
            resource_index += 1

            ET.SubElement(
                resources,
                "asset",
                id=scene["telop_id"],
                name=f"{scene['title']}_telop",
                src=_to_file_uri(scene["telop_video_path"], export_dir),
                start="0s",
                duration=duration,
                hasVideo="1",
                hasAudio="0",
                format="r1",
            )

    library = ET.SubElement(fcpxml, "library")
    event = ET.SubElement(library, "event", name="Exported Event")
    project = ET.SubElement(event, "project", name="Auto Timeline")

    sequence = ET.SubElement(
        project,
        "sequence",
        format="r1",
        duration=total_duration,
        tcStart="0s",
        tcFormat="NDF",
        audioLayout="stereo",
        audioRate="48k",
    )

    spine = ET.SubElement(sequence, "spine")

    current_seconds = 0

    for scene in scene_assets:
        offset = _seconds_to_fcpx_time(current_seconds, fps)
        duration = _seconds_to_fcpx_time(scene["duration_seconds"], fps)

        if scene.get("bg_id"):
            ET.SubElement(
                spine,
                "asset-clip",
                name=f"{scene['title']}_bg",
                ref=scene["bg_id"],
                offset=offset,
                duration=duration,
                start="0s",
            )

        if scene.get("audio_id"):
            ET.SubElement(
                spine,
                "asset-clip",
                name=f"{scene['title']}_audio",
                ref=scene["audio_id"],
                offset=offset,
                duration=duration,
                start="0s",
                lane="-1",
            )

        if scene.get("telop_id"):
            ET.SubElement(
                spine,
                "asset-clip",
                name=f"{scene['title']}_telop",
                ref=scene["telop_id"],
                offset=offset,
                duration=duration,
                start="0s",
                lane="1",
            )

        current_seconds += scene["duration_seconds"]

    ET.ElementTree(fcpxml).write(xml_path, encoding="utf-8", xml_declaration=True)

    return xml_path.as_posix()

# def create_fcpxml(manifest: dict, export_dir: Path) -> str:
#     xml_path = export_dir / "timeline.fcpxml"

#     fps = 30
#     scene_assets = []
#     total_seconds = 0

#     for scene in manifest.get("scenes", []):
#         duration_seconds = scene.get("duration_seconds") or 5
#         title = scene.get("title") or "scene"
#         audio_path = scene.get("audio_path")
#         background_path = scene.get("background_path")

#         total_seconds += duration_seconds

#         scene_assets.append(
#             {
#                 "title": title,
#                 "audio_path": audio_path,
#                 "background_path": background_path,
#                 "duration_seconds": duration_seconds,
#             }
#         )

#     total_duration = _seconds_to_fcpx_time(total_seconds or 1, fps=fps)

#     fcpxml = ET.Element("fcpxml", version="1.11")

#     resources = ET.SubElement(fcpxml, "resources")
#     ET.SubElement(
#         resources,
#         "format",
#         id="r1",
#         name="FFVideoFormat1080p30",
#         frameDuration="1/30s",
#         width="1920",
#         height="1080",
#         colorSpace="1-1-1 (Rec. 709)",
#     )

#     resource_index = 2

#     for scene in scene_assets:
#         audio_path = scene.get("audio_path")
#         background_path = scene.get("background_path")

#         scene["audio_asset_id"] = None
#         scene["bg_asset_id"] = None

#         if audio_path:
#             audio_asset_id = f"r{resource_index}"
#             resource_index += 1

#             ET.SubElement(
#                 resources,
#                 "asset",
#                 id=audio_asset_id,
#                 name=f"{scene['title']}_audio",
#                 src=_to_file_uri(audio_path),
#                 start="0s",
#                 duration=_seconds_to_fcpx_time(scene.get("duration_seconds") or 5, fps=fps),
#                 hasAudio="1",
#                 hasVideo="0",
#                 audioSources="1",
#                 audioChannels="2",
#                 audioRate="48k",
#             )

#             scene["audio_asset_id"] = audio_asset_id

#         if background_path and _is_supported_image_file(background_path):
#             bg_asset_id = f"r{resource_index}"
#             resource_index += 1

#             ET.SubElement(
#                 resources,
#                 "asset",
#                 id=bg_asset_id,
#                 name=f"{scene['title']}_bg",
#                 src=_to_file_uri(background_path),
#                 start="0s",
#                 duration=_seconds_to_fcpx_time(scene.get("duration_seconds") or 5, fps=fps),
#                 hasAudio="0",
#                 hasVideo="1",
#                 format="r1",
#             )

#             scene["bg_asset_id"] = bg_asset_id

#     library = ET.SubElement(fcpxml, "library")
#     event = ET.SubElement(library, "event", name="Exported Event")
#     project = ET.SubElement(event, "project", name="Auto Timeline")

#     sequence = ET.SubElement(
#         project,
#         "sequence",
#         format="r1",
#         duration=total_duration,
#         tcStart="0s",
#         tcFormat="NDF",
#         audioLayout="stereo",
#         audioRate="48k",
#     )

#     spine = ET.SubElement(sequence, "spine")

#     current_seconds = 0

#     for scene in scene_assets:
#         offset = _seconds_to_fcpx_time(current_seconds, fps=fps)
#         duration = _seconds_to_fcpx_time(scene.get("duration_seconds") or 5, fps=fps)

#         # 背景を親クリップにする
#         if scene["bg_asset_id"]:
#             bg_clip = ET.SubElement(
#                 spine,
#                 "asset-clip",
#                 name=f"{scene['title']}_bg",
#                 ref=scene["bg_asset_id"],
#                 offset=offset,
#                 duration=duration,
#                 start="0s",
#             )

#             if scene["audio_asset_id"]:
#                 ET.SubElement(
#                     bg_clip,
#                     "asset-clip",
#                     name=f"{scene['title']}_audio",
#                     ref=scene["audio_asset_id"],
#                     offset="0s",
#                     duration=duration,
#                     start="0s",
#                     lane="-1",
#                 )

#         # 背景がない場合は音声だけ置く
#         elif scene["audio_asset_id"]:
#             ET.SubElement(
#                 spine,
#                 "asset-clip",
#                 name=scene["title"],
#                 ref=scene["audio_asset_id"],
#                 offset=offset,
#                 duration=duration,
#                 start="0s",
#             )

#         current_seconds += scene.get("duration_seconds") or 5

#     tree = ET.ElementTree(fcpxml)
#     tree.write(xml_path, encoding="utf-8", xml_declaration=True)

#     return xml_path.as_posix()

def export_davinci_manifest(db: Session, video_id: int, export_name: str | None = None) -> dict:
    manifest = build_davinci_manifest(db, video_id)

    export_dir = _build_export_dir(video_id, export_name)
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

    # --- background動画生成 ---
    rendered_bg_dir = export_dir / "rendered_bg"

    for scene in manifest["scenes"]:
        bg_path = scene.get("background_path")

        if not bg_path:
            continue

        duration = scene.get("duration_seconds") or 5

        output_path = rendered_bg_dir / f"scene_{scene['scene_id']}_bg.mp4"

        try:
            generate_bg_video(bg_path, output_path, duration)
            scene["bg_video_path"] = output_path.as_posix()
        except Exception:
            scene["bg_video_path"] = None

    # --- テロップ生成 ---
    rendered_telop_dir = export_dir / "rendered_telop"

    for scene in manifest["scenes"]:
        duration = scene.get("duration_seconds") or 5

        selected_voice = scene.get("selected_voice_asset") or {}
        subtitle_png_path = selected_voice.get("subtitle_png_path")
        text = scene.get("telop")

        img_path = rendered_telop_dir / f"scene_{scene['scene_id']}_telop.png"
        video_path = rendered_telop_dir / f"scene_{scene['scene_id']}_telop.mp4"

        scene["telop_video_path"] = None

        try:
            if subtitle_png_path:
                copied_subtitle = _safe_copy(
                    subtitle_png_path,
                    rendered_telop_dir,
                    f"scene_{scene['scene_id']}_subtitle"
                )

                if copied_subtitle:
                    generated_path = generate_telop_video(copied_subtitle, video_path, duration)
                    scene["telop_video_path"] = generated_path
                    continue
                else:
                    missing_files.append(subtitle_png_path)

            if text:
                generate_telop_image(text, img_path)
                generated_path = generate_telop_video(str(img_path), video_path, duration)
                scene["telop_video_path"] = generated_path

        except Exception:
            scene["telop_video_path"] = None

    # --- voice assets ---
    for voice in manifest["voice_assets"]:
        audio = voice.get("audio_path")
        copied_audio = _safe_copy(audio, audio_dir, f"voice_{voice['voice_asset_id']}")

        if audio and not copied_audio:
            missing_files.append(audio)

        voice["audio_path"] = copied_audio

        subtitle_png = voice.get("subtitle_png_path")
        copied_subtitle_png = _safe_copy(
            subtitle_png,
            export_dir / "subtitles",
            f"voice_{voice['voice_asset_id']}_subtitle"
        )

        if subtitle_png and not copied_subtitle_png:
            missing_files.append(subtitle_png)

        voice["subtitle_png_path"] = copied_subtitle_png

    manifest["missing_files"] = missing_files

    csv_path = create_davinci_scenes_csv(manifest, export_dir)
    manifest["scenes_csv_path"] = csv_path

    fcpxml_path = create_fcpxml(manifest, export_dir)
    manifest["fcpxml_path"] = fcpxml_path

    manifest_path = export_dir / "manifest.json"

    with manifest_path.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    return {
        "message": "DaVinci export with assets created",
        "video_id": video_id,
        "export_name": _sanitize_export_name(export_name),
        "export_dir": export_dir.as_posix(),
        "manifest_path": manifest_path.as_posix(),
        "csv_path": csv_path,
        "fcpxml_path": fcpxml_path,
        "missing_files": missing_files,
    }

def create_davinci_export_zip(video_id: int) -> dict:
    candidate_dirs = sorted(
        EXPORT_BASE_DIR.glob(f"video_{video_id}_*"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    if not candidate_dirs:
        raise FileNotFoundError("Export directory not found")

    export_dir = candidate_dirs[0]
    zip_path = EXPORT_BASE_DIR / f"{export_dir.name}.zip"

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