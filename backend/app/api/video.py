from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import os
import uuid

from fastapi import UploadFile, File, Form

from app.dependencies.db import get_db
from app.models.scene import Scene
from app.models.video import Video
from app.models.asset import Asset
from app.models.task import Task
from app.models.voice_asset import VoiceAsset
from app.schemas.video import (
    DavinciExportRequest,
    VideoCreate,
    VideoResponse,
    VideoUpdate,
)
from app.services.davinci_export import (
    create_davinci_export_zip,
    export_davinci_manifest,
)
from app.models.asset import Asset

router = APIRouter(prefix="/videos", tags=["videos"])


@router.post("/", response_model=VideoResponse)
def create_video(video: VideoCreate, db: Session = Depends(get_db)):
    new_video = Video(
        title=video.title,
        thumbnail_url=video.thumbnail_url,
        description=video.description,
        tags=video.tags,
        video_path=video.video_path,
        youtube_url=video.youtube_url,
        youtube_id=video.youtube_id,
        published_at=video.published_at,
        concept=video.concept,
        target=video.target,
        goal=video.goal,
        structure=video.structure,
        script=video.script,
        memo=video.memo,
        status=video.status,
        analytics_source=video.analytics_source,
        aspect_ratio=video.aspect_ratio,
        frame_width=video.frame_width,
        frame_height=video.frame_height,
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    return new_video

@router.get("/{video_id}/credits")
def get_video_credits(video_id: int, db: Session = Depends(get_db)):
    assets = (
        db.query(Asset)
        .filter(Asset.video_id == video_id)
        .all()
    )

    def map_category(asset_type: str):
        return {
            "bgm": "BGM",
            "se": "効果音",
            "audio": "音声",
            "background": "背景",
        }.get(asset_type, "その他")

    groups = {
        "BGM": [],
        "効果音": [],
        "音声": [],
        "背景": [],
        "その他": [],
    }

    seen = set()

    for asset in assets:
        credit_text = (asset.source_note or "").strip() or (asset.title or "").strip()
        if not credit_text:
            continue

        if not credit_text or credit_text in seen:
            continue

        seen.add(credit_text)

        category = map_category(asset.asset_type)
        groups[category].append(credit_text)

    # テキスト生成
    lines = ["【使用素材・クレジット】"]

    for category, items in groups.items():
        if not items:
            continue

        lines.append("")
        lines.append(f"【{category}】")

        for item in items:
            lines.append(item)

    text = "\n".join(lines)

    return {
        "video_id": video_id,
        "groups": groups,
        "credits": list(seen),
        "text": text,
    }

@router.get("/{video_id}/description-template")
def get_video_description_template(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    assets = (
        db.query(Asset)
        .filter(Asset.video_id == video_id)
        .all()
    )

    def map_category(asset_type: str):
        return {
            "bgm": "BGM",
            "se": "効果音",
            "audio": "音声",
            "voice": "音声",
            "background": "背景",
        }.get(asset_type, "その他")

    groups = {
        "音声": [],
        "BGM": [],
        "効果音": [],
        "背景": [],
        "その他": [],
    }

    seen_by_category = {key: set() for key in groups.keys()}

    for asset in assets:
        source_note = (asset.source_note or "").strip()
        title = (asset.title or "").strip()

        # source_note があれば優先、なければ title を使う
        credit_text = source_note or title
        if not credit_text:
            continue

        category = map_category(asset.asset_type)

        if credit_text in seen_by_category[category]:
            continue

        seen_by_category[category].add(credit_text)
        groups[category].append(credit_text)

    def build_lines(title, items):
        lines = [f"【{title}】"]
        if items:
            lines.extend([f"・{item}" for item in items])
        else:
            lines.append("・なし")
        return lines

    hashtag_text = ""
    if video.tags:
        raw_tags = [tag.strip() for tag in video.tags.split(",") if tag.strip()]
        hashtag_text = " ".join(
            [tag if tag.startswith("#") else f"#{tag.replace(' ', '')}" for tag in raw_tags]
        )

    lines = [
        f"【{video.title}】",
        "",
        (video.description or "").strip() or "ここに動画の説明を書いてください。",
        "",
        "▼使用素材・クレジット",
        "",
        *build_lines("音声", groups["音声"]),
        "",
        *build_lines("BGM", groups["BGM"]),
        "",
        *build_lines("効果音", groups["効果音"]),
        "",
        *build_lines("背景", groups["背景"]),
    ]

    if groups["その他"]:
        lines.extend([
            "",
            *build_lines("その他", groups["その他"]),
        ])

    lines.extend([
        "",
        "▼タグ",
        hashtag_text or "#動画 #YouTube",
    ])

    text = "\n".join(lines)

    return {
        "video_id": video_id,
        "groups": groups,
        "text": text,
    }

@router.get("/", response_model=list[VideoResponse])
def list_videos(db: Session = Depends(get_db)):
    videos = db.query(Video).order_by(Video.created_at.desc(), Video.id.desc()).all()
    return videos


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.put("/{video_id}", response_model=VideoResponse)
def update_video(video_id: int, video_data: VideoUpdate, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    video.title = video_data.title
    video.thumbnail_url = video_data.thumbnail_url
    video.description = video_data.description
    video.tags = video_data.tags
    video.video_path = video_data.video_path
    video.youtube_url = video_data.youtube_url
    video.youtube_id = video_data.youtube_id
    video.published_at = video_data.published_at
    video.concept = video_data.concept
    video.target = video_data.target
    video.goal = video_data.goal
    video.structure = video_data.structure
    video.script = video_data.script
    video.memo = video_data.memo
    video.status = video_data.status
    video.analytics_source = video_data.analytics_source
    video.aspect_ratio = video_data.aspect_ratio
    video.frame_width = video_data.frame_width
    video.frame_height = video_data.frame_height

    db.commit()
    db.refresh(video)
    return video

@router.post("/thumbnail/upload")
def upload_video_thumbnail(
    file: UploadFile = File(...),
):
    upload_dir = os.path.join("uploads", "thumbnails")
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"{uuid.uuid4()}_{file.filename}"
    save_path = os.path.join(upload_dir, filename)

    with open(save_path, "wb") as f:
        f.write(file.file.read())

    return {
        "thumbnail_url": f"uploads/thumbnails/{filename}"
    }

@router.post("/{video_id}/duplicate", response_model=VideoResponse)
def duplicate_video(video_id: int, db: Session = Depends(get_db)):
    source_video = db.query(Video).filter(Video.id == video_id).first()
    if source_video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    duplicated_video = Video(
        title=f"{source_video.title}（複製）",
        thumbnail_url=source_video.thumbnail_url,
        description=source_video.description,
        tags=source_video.tags,
        video_path=source_video.video_path,
        youtube_url=source_video.youtube_url,
        youtube_id=source_video.youtube_id,
        published_at=source_video.published_at,
        concept=source_video.concept,
        target=source_video.target,
        goal=source_video.goal,
        structure=source_video.structure,
        script=source_video.script,
        memo=source_video.memo,
        status="draft",
        analytics_source=source_video.analytics_source,
        aspect_ratio=source_video.aspect_ratio,
        frame_width=source_video.frame_width,
        frame_height=source_video.frame_height,
    )
    db.add(duplicated_video)
    db.flush()

    source_scenes = (
        db.query(Scene)
        .filter(Scene.video_id == source_video.id)
        .order_by(Scene.position.asc(), Scene.id.asc())
        .all()
    )

    scene_id_map = {}

    for scene in source_scenes:
        duplicated_scene = Scene(
            video_id=duplicated_video.id,
            title=scene.title,
            script=scene.script,
            materials=scene.materials,
            position=scene.position,
            section_type=scene.section_type,
            status=scene.status,
            duration_seconds=scene.duration_seconds,
            audio_path=scene.audio_path,
            character_name=scene.character_name,
            character_expression=scene.character_expression,
            background_path=scene.background_path,
            background_fit_mode=scene.background_fit_mode,
            se_path=scene.se_path,
            telop=scene.telop,
            direction=scene.direction,
            edit_note=scene.edit_note,
        )
        db.add(duplicated_scene)
        db.flush()
        scene_id_map[scene.id] = duplicated_scene.id

    source_assets = (
        db.query(Asset)
        .filter(Asset.video_id == source_video.id)
        .order_by(Asset.id.asc())
        .all()
    )

    asset_id_map = {}

    for asset in source_assets:
        duplicated_asset = Asset(
            video_id=duplicated_video.id,
            scene_id=scene_id_map.get(asset.scene_id),
            asset_type=asset.asset_type,
            title=asset.title,
            status=asset.status,
            location_type=asset.location_type,
            path_or_url=asset.path_or_url,
            relative_path=asset.relative_path,
            source_note=asset.source_note,
            search_keyword=asset.search_keyword,
            memo=asset.memo,
        )
        db.add(duplicated_asset)
        db.flush()
        asset_id_map[asset.id] = duplicated_asset.id

    source_voice_assets = (
        db.query(VoiceAsset)
        .join(Scene, VoiceAsset.scene_id == Scene.id)
        .filter(Scene.video_id == source_video.id)
        .order_by(VoiceAsset.id.asc())
        .all()
    )

    for voice_asset in source_voice_assets:
        duplicated_scene_id = scene_id_map.get(voice_asset.scene_id)
        if duplicated_scene_id is None:
            continue

        duplicated_voice_asset = VoiceAsset(
            scene_id=duplicated_scene_id,
            text=voice_asset.text,
            style_id=voice_asset.style_id,
            character_name=voice_asset.character_name,
            style_name=voice_asset.style_name,
            speed=voice_asset.speed,
            pitch=voice_asset.pitch,
            intonation=voice_asset.intonation,
            volume=voice_asset.volume,
            audio_path=voice_asset.audio_path,
            subtitle_png_path=voice_asset.subtitle_png_path,
            is_selected=voice_asset.is_selected,
        )
        db.add(duplicated_voice_asset)

    source_tasks = (
        db.query(Task)
        .filter(Task.video_id == source_video.id)
        .order_by(Task.sort_order.asc(), Task.id.asc())
        .all()
    )

    task_id_map = {}

    for task in source_tasks:
        duplicated_task = Task(
            video_id=duplicated_video.id,
            scene_id=scene_id_map.get(task.scene_id),
            asset_id=asset_id_map.get(task.asset_id),
            parent_task_id=None,
            title=task.title,
            detail=task.detail,
            task_type=task.task_type,
            priority=task.priority,
            status=task.status,
            sort_order=task.sort_order,
        )
        db.add(duplicated_task)
        db.flush()
        task_id_map[task.id] = duplicated_task.id

    for task in source_tasks:
        if task.parent_task_id is None:
            continue

        duplicated_task_id = task_id_map.get(task.id)
        duplicated_parent_task_id = task_id_map.get(task.parent_task_id)
        if duplicated_task_id is None or duplicated_parent_task_id is None:
            continue

        duplicated_task = db.query(Task).filter(Task.id == duplicated_task_id).first()
        duplicated_task.parent_task_id = duplicated_parent_task_id

    db.commit()
    db.refresh(duplicated_video)

    return duplicated_video


@router.post("/{video_id}/export/davinci")
def export_video_for_davinci(
    video_id: int,
    payload: DavinciExportRequest,
    db: Session = Depends(get_db),
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    return export_davinci_manifest(
        db=db,
        video_id=video_id,
        export_name=payload.export_name,
    )


@router.get("/{video_id}/export/davinci/download")
def download_video_davinci_export(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    export_candidates = sorted(
        Path("exports").glob(f"video_{video_id}_*"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    if not export_candidates:
        raise HTTPException(
            status_code=400,
            detail="先にDaVinci出力を実行してください",
        )

    latest_export_dir = export_candidates[0]
    manifest_path = latest_export_dir / "manifest.json"

    if not manifest_path.exists():
        raise HTTPException(
            status_code=400,
            detail="先にDaVinci出力を実行してください",
        )

    try:
        zip_info = create_davinci_export_zip(video_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Export directory not found")

    return FileResponse(
        path=zip_info["zip_path"],
        filename=zip_info["zip_name"],
        media_type="application/zip",
    )


@router.delete("/{video_id}")
def delete_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    db.delete(video)
    db.commit()

    return {"message": "Video deleted"}