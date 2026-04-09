from app.models.task import Task


def build_task_title(task_type: str, scene_number: int) -> str:
    mapping = {
        "script": f"シーン{scene_number}: 台本作成",
        "voice": f"シーン{scene_number}: 音声作成",
        "voice_sub": None,          # 子タスクは title を個別判定
        "background": f"シーン{scene_number}: 背景準備",
        "background_sub": None,
        "asset": f"シーン{scene_number}: 素材準備",
        "asset_sub": None,
        "edit": f"シーン{scene_number}: 編集",
        "review": f"シーン{scene_number}: 確認",
    }
    return mapping.get(task_type)


def build_child_task_title(old_title: str, scene_number: int) -> str:
    """
    既存タイトルの 'シーンX: ' 部分だけ差し替える
    """
    if ": " in old_title:
        _, suffix = old_title.split(": ", 1)
        return f"シーン{scene_number}: {suffix}"
    return old_title


def sync_task_titles_for_scene(db, scene) -> None:
    """
    scene.position をもとに、そのシーン配下タスクのタイトルを更新する
    """
    scene_number = scene.position + 1
    tasks = db.query(Task).filter(Task.scene_id == scene.id).all()

    for task in tasks:
        if task.parent_task_id is None:
            new_title = build_task_title(task.task_type, scene_number)
            if new_title:
                task.title = new_title
        else:
            task.title = build_child_task_title(task.title, scene_number)