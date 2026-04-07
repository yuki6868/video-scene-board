from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.models.scene import Scene
from app.schemas.scene import SceneCreate, SceneResponse

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