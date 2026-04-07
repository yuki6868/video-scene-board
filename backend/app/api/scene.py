from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.models.scene import Scene
from app.models.video import Video
from app.schemas.scene import (
    SceneCreate,
    SceneResponse,
    SceneReorderItem,
    SceneUpdate,
)

router = APIRouter(tags=["scenes"])


@router.post("/videos/{video_id}/scenes", response_model=SceneResponse)
def create_scene(video_id: int, scene: SceneCreate, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    new_scene = Scene(
        video_id=video_id,
        title=scene.title,
        script=scene.script,
        materials=scene.materials,
        position=scene.position,
    )
    db.add(new_scene)
    db.commit()
    db.refresh(new_scene)
    return new_scene


@router.get("/videos/{video_id}/scenes", response_model=list[SceneResponse])
def list_scenes(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    scenes = (
        db.query(Scene)
        .filter(Scene.video_id == video_id)
        .order_by(Scene.position.asc(), Scene.id.asc())
        .all()
    )
    return scenes


@router.get("/scenes/{scene_id}", response_model=SceneResponse)
def get_scene(scene_id: int, db: Session = Depends(get_db)):
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene


@router.put("/videos/{video_id}/scenes/reorder", response_model=list[SceneResponse])
def reorder_scenes(video_id: int, items: list[SceneReorderItem], db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    ids = [item.id for item in items]

    scenes = (
        db.query(Scene)
        .filter(Scene.video_id == video_id, Scene.id.in_(ids))
        .all()
    )
    scene_map = {scene.id: scene for scene in scenes}

    if len(scene_map) != len(items):
        raise HTTPException(status_code=404, detail="Some scenes were not found in this video")

    for item in items:
        scene_map[item.id].position = item.position

    db.commit()

    updated_scenes = (
        db.query(Scene)
        .filter(Scene.video_id == video_id)
        .order_by(Scene.position.asc(), Scene.id.asc())
        .all()
    )
    return updated_scenes


@router.put("/scenes/{scene_id}", response_model=SceneResponse)
def update_scene(scene_id: int, scene_data: SceneUpdate, db: Session = Depends(get_db)):
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")

    scene.title = scene_data.title
    scene.script = scene_data.script
    scene.materials = scene_data.materials
    scene.position = scene_data.position

    db.commit()
    db.refresh(scene)
    return scene


@router.delete("/scenes/{scene_id}")
def delete_scene(scene_id: int, db: Session = Depends(get_db)):
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")

    video_id = scene.video_id
    deleted_position = scene.position

    db.delete(scene)
    db.commit()

    remaining_scenes = (
        db.query(Scene)
        .filter(Scene.video_id == video_id, Scene.position > deleted_position)
        .order_by(Scene.position.asc())
        .all()
    )

    for remaining_scene in remaining_scenes:
        remaining_scene.position -= 1

    db.commit()

    return {"message": "Scene deleted"}