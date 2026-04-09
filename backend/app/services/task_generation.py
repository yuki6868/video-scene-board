# app/services/task_generation.py

from typing import List, Dict


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
    シーン作成時に生成する親タスク・子タスク定義を返す
    parent_key が None のものは親タスク
    parent_key があるものは、その親にぶら下がる子タスク
    """
    return [
        {
            "key": "script",
            "parent_key": None,
            "title": f"シーン{scene_order}: 台本作成",
            "task_type": "script",
            "scene_id": scene_id,
            "priority": "高",
            "status": "未着手",
        },
        {
            "key": "voice",
            "parent_key": None,
            "title": f"シーン{scene_order}: 音声作成",
            "task_type": "voice",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "voice_script_confirm",
            "parent_key": "voice",
            "title": f"シーン{scene_order}: 台本を確定する",
            "task_type": "voice_sub",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "voice_generate",
            "parent_key": "voice",
            "title": f"シーン{scene_order}: 音声を生成する",
            "task_type": "voice_sub",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "voice_review",
            "parent_key": "voice",
            "title": f"シーン{scene_order}: 音声を確認する",
            "task_type": "voice_sub",
            "scene_id": scene_id,
            "priority": "低",
            "status": "未着手",
        },
        {
            "key": "background",
            "parent_key": None,
            "title": f"シーン{scene_order}: 背景準備",
            "task_type": "background",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "background_search",
            "parent_key": "background",
            "title": f"シーン{scene_order}: 背景画像を探す",
            "task_type": "background_sub",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "background_register",
            "parent_key": "background",
            "title": f"シーン{scene_order}: 背景画像を登録する",
            "task_type": "background_sub",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "background_apply",
            "parent_key": "background",
            "title": f"シーン{scene_order}: 背景を適用する",
            "task_type": "background_sub",
            "scene_id": scene_id,
            "priority": "低",
            "status": "未着手",
        },
        {
            "key": "asset",
            "parent_key": None,
            "title": f"シーン{scene_order}: 素材準備",
            "task_type": "asset",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "asset_search",
            "parent_key": "asset",
            "title": f"シーン{scene_order}: メイン素材を探す",
            "task_type": "asset_sub",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "asset_register",
            "parent_key": "asset",
            "title": f"シーン{scene_order}: メイン素材を登録する",
            "task_type": "asset_sub",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "edit",
            "parent_key": None,
            "title": f"シーン{scene_order}: 編集",
            "task_type": "edit",
            "scene_id": scene_id,
            "priority": "高",
            "status": "未着手",
        },
        {
            "key": "review",
            "parent_key": None,
            "title": f"シーン{scene_order}: 確認",
            "task_type": "review",
            "scene_id": scene_id,
            "priority": "低",
            "status": "未着手",
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