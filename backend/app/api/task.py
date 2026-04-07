from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.models.task import Task
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

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return None