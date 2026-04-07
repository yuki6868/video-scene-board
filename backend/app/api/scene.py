from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.models.scene import Scene
from app.schemas.scene import SceneCreate, SceneResponse, SceneUpdate

router = APIRouter(prefix="/scenes", tags=["scenes"])


@router.post("/", response_model=SceneResponse)
def create_scene(scene: SceneCreate, db: Session = Depends(get_db)):
    new_scene = Scene(
        title=scene.title,
        script=scene.script,
        materials=scene.materials,
        position=scene.position,
    )
    db.add(new_scene)
    db.commit()
    db.refresh(new_scene)
    return new_scene


@router.get("/", response_model=list[SceneResponse])
def list_scenes(db: Session = Depends(get_db)):
    scenes = db.query(Scene).order_by(Scene.position.asc(), Scene.id.asc()).all()
    return scenes


@router.get("/{scene_id}", response_model=SceneResponse)
def get_scene(scene_id: int, db: Session = Depends(get_db)):
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene


@router.put("/{scene_id}", response_model=SceneResponse)
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


@router.delete("/{scene_id}")
def delete_scene(scene_id: int, db: Session = Depends(get_db)):
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")

    db.delete(scene)
    db.commit()
    return {"message": "Scene deleted"}