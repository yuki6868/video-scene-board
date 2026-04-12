from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.task import Task


def get_next_task_sort_order(db: Session, video_id: int, parent_task_id: int | None) -> int:
    max_sort = (
        db.query(func.max(Task.sort_order))
        .filter(Task.video_id == video_id, Task.parent_task_id.is_(parent_task_id))
        .scalar()
    )
    return 0 if max_sort is None else int(max_sort) + 1