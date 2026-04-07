from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.models.video import Video
from app.schemas.video import VideoCreate, VideoResponse, VideoUpdate

router = APIRouter(prefix="/videos", tags=["videos"])


@router.post("/", response_model=VideoResponse)
def create_video(video: VideoCreate, db: Session = Depends(get_db)):
    new_video = Video(
        title=video.title,
        description=video.description,
        status=video.status,
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
    video.description = video_data.description
    video.status = video_data.status

    db.commit()
    db.refresh(video)
    return video


@router.delete("/{video_id}")
def delete_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    db.delete(video)
    db.commit()

    return {"message": "Video deleted"}