from app.models.task import Task


def update_descendant_statuses(db, parent_task_id: int, new_status: str) -> None:
    children = db.query(Task).filter(Task.parent_task_id == parent_task_id).all()

    for child in children:
        child.status = new_status
        update_descendant_statuses(db, child.id, new_status)


def recalculate_parent_task_status(db, parent_task_id: int | None) -> None:
    if parent_task_id is None:
        return

    parent_task = db.query(Task).filter(Task.id == parent_task_id).first()
    if parent_task is None:
        return

    children = db.query(Task).filter(Task.parent_task_id == parent_task_id).all()
    if not children:
        return

    child_statuses = [child.status for child in children]

    if all(status == "完了" for status in child_statuses):
        parent_task.status = "完了"
    elif all(status == "未着手" for status in child_statuses):
        parent_task.status = "未着手"
    else:
        parent_task.status = "作業中"

    # さらに上の親も再計算
    recalculate_parent_task_status(db, parent_task.parent_task_id)