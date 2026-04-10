from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.services.task_sync import (
    recalculate_parent_task_status,
    update_descendant_statuses,
)
from app.models.asset import Asset
from app.models.task import Task
from app.models.scene import Scene
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/", response_model=List[TaskResponse])
def list_tasks(
    video_id: Optional[int] = Query(default=None),
    scene_id: Optional[int] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Task)

    if video_id is not None:
        query = query.filter(Task.video_id == video_id)

    if scene_id is not None:
        query = query.filter(Task.scene_id == scene_id)

    if status is not None:
        query = query.filter(Task.status == status)

    tasks = query.order_by(Task.id.desc()).all()
    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/", response_model=TaskResponse, status_code=201)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    task = Task(**task_in.model_dump())
    db.add(task)
    db.flush()

    # 親タスクがあるなら追加後に再計算
    if task.parent_task_id is not None:
        recalculate_parent_task_status(db, task.parent_task_id)

    db.commit()
    db.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_in.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(task, key, value)

    if "status" in update_data:
        children = db.query(Task).filter(Task.parent_task_id == task.id).all()
        if children:
            update_descendant_statuses(db, task.id, task.status)

    if task.asset_id is not None:
        asset = db.query(Asset).filter(Asset.id == task.asset_id).first()

        if asset is not None:
            if task.status == "完了":
                asset.status = "ready"
            elif task.status == "作業中":
                asset.status = "creating"
            else:
                asset.status = "idea"

            # task.scene_id を優先して同期先を決める
            target_scene_id = task.scene_id if task.scene_id is not None else asset.scene_id

            if asset.asset_type == "background" and target_scene_id is not None:
                scene = db.query(Scene).filter(Scene.id == target_scene_id).first()
                if scene is not None:
                    if task.status == "完了" and asset.path_or_url:
                        scene.background_path = asset.path_or_url
                    elif scene.background_path == asset.path_or_url:
                        scene.background_path = None

    db.commit()
    db.refresh(task)

    if task.parent_task_id is not None:
        recalculate_parent_task_status(db, task.parent_task_id)

    db.commit()
    db.refresh(task)
    return task


def delete_task_with_children(db: Session, task: Task) -> None:
    children = db.query(Task).filter(Task.parent_task_id == task.id).all()
    for child in children:
        delete_task_with_children(db, child)
    db.delete(task)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    parent_task_id = task.parent_task_id

    delete_task_with_children(db, task)
    db.flush()

    if parent_task_id is not None:
        recalculate_parent_task_status(db, parent_task_id)

    db.commit()