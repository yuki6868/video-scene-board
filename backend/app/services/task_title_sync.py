from app.models.task import Task


def build_task_title(task, scene_number: int, scene_title: str) -> str | None:
    if task.task_type == "scene_group":
        return f"シーン{scene_number}: {scene_title}"

    # カテゴリ親と子は固定タイトル
    fixed_titles = {
        "voice": "音声",
        "voice_sub": {
            "台本を確定する": "台本を確定する",
            "音声を生成する": "音声を生成する",
            "音声を確認する": "音声を確認する",
        },
        "background": "背景",
        "background_sub": {
            "背景画像を探す": "背景画像を探す",
            "背景画像を登録する": "背景画像を登録する",
            "背景を適用する": "背景を適用する",
        },
        "asset": "素材",
        "asset_sub": {
            "メイン素材を探す": "メイン素材を探す",
            "メイン素材を登録する": "メイン素材を登録する",
        },
        "edit": "編集",
        "review": "確認",
    }

    if task.task_type in ("voice", "background", "asset", "edit", "review"):
        return fixed_titles[task.task_type]

    if task.task_type in ("voice_sub", "background_sub", "asset_sub"):
        return task.title

    return None


def sync_task_titles_for_scene(db, scene) -> None:
    tasks = db.query(Task).filter(Task.scene_id == scene.id).all()
    scene_number = scene.position + 1

    for task in tasks:
        new_title = build_task_title(task, scene_number, scene.title)
        if new_title:
            task.title = new_title