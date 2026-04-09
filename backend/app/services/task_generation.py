# app/services/task_generation.py

from typing import List, Dict


# タスク種別（固定化）
TASK_TYPES = {
    "script": "台本作成",
    "voice": "音声作成",
    "background": "背景準備",
    "asset": "素材準備",
    "edit": "編集",
    "review": "確認",
}


def get_scene_initial_tasks(scene_id: int, scene_order: int) -> List[Dict]:
    """
    シーン作成時に生成するタスク一覧を返す
    """
    return [
        {
            "title": f"シーン{scene_order}: 台本作成",
            "task_type": "script",
            "scene_id": scene_id,
            "priority": "high",
        },
        {
            "title": f"シーン{scene_order}: 音声作成",
            "task_type": "voice",
            "scene_id": scene_id,
            "priority": "medium",
        },
        {
            "title": f"シーン{scene_order}: 背景準備",
            "task_type": "background",
            "scene_id": scene_id,
            "priority": "medium",
        },
        {
            "title": f"シーン{scene_order}: 素材準備",
            "task_type": "asset",
            "scene_id": scene_id,
            "priority": "medium",
        },
        {
            "title": f"シーン{scene_order}: 編集",
            "task_type": "edit",
            "scene_id": scene_id,
            "priority": "high",
        },
        {
            "title": f"シーン{scene_order}: 確認",
            "task_type": "review",
            "scene_id": scene_id,
            "priority": "low",
        },
    ]


def get_asset_related_tasks(scene_id: int, scene_order: int) -> List[Dict]:
    """
    素材作成時に生成するタスク（将来用）
    """
    return [
        {
            "title": f"シーン{scene_order}: 素材確認",
            "task_type": "asset",
            "scene_id": scene_id,
            "priority": "medium",
        }
    ]