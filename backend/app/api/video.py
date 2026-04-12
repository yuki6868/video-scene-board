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

    for scene in source_scenes:
        duplicated_scene = Scene(
            video_id=duplicated_video.id,
            title=scene.title,
            script=scene.script,
            materials=scene.materials,
            position=scene.position,
        )
        db.add(duplicated_scene)

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