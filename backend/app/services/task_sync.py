from app.models.task import Task


def recalculate_parent_task_status(db, parent_task_id: int) -> None:
    """
    子タスクの状態から親タスクの状態を再計算する
    """
    parent_task = db.query(Task).filter(Task.id == parent_task_id).first()
    if parent_task is None:
        return

    children = db.query(Task).filter(Task.parent_task_id == parent_task_id).all()
    if not children:
        return

    child_statuses = [child.status for child in children]

    if all(status == "完了" for status in child_statuses):
        parent_task.status = "完了"
    elif any(status == "作業中" for status in child_statuses):
        parent_task.status = "作業中"
    elif any(status == "完了" for status in child_statuses):
        parent_task.status = "作業中"
    else:
        parent_task.status = "未着手"