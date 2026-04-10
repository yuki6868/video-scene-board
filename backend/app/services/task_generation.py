from typing import List, Dict


def get_scene_initial_tasks(scene_id: int, scene_order: int, scene_title: str) -> List[Dict]:
    """
    3階層タスクを返す
    scene_group
      ├ voice / background / asset / edit / review
      └ それぞれの子タスク
    """
    return [
        {
            "key": "scene_group",
            "parent_key": None,
            "title": f"シーン{scene_order}: {scene_title}",
            "task_type": "scene_group",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },

        {
            "key": "voice",
            "parent_key": "scene_group",
            "title": "音声",
            "task_type": "voice",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "voice_script_confirm",
            "parent_key": "voice",
            "title": "台本を確定する",
            "task_type": "voice_sub",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "voice_generate",
            "parent_key": "voice",
            "title": "音声を生成する",
            "task_type": "voice_sub",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "voice_review",
            "parent_key": "voice",
            "title": "音声を確認する",
            "task_type": "voice_sub",
            "scene_id": scene_id,
            "priority": "低",
            "status": "未着手",
        },

        {
            "key": "background",
            "parent_key": "scene_group",
            "title": "背景",
            "task_type": "background",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "background_search",
            "parent_key": "background",
            "title": "背景画像を探す",
            "task_type": "background_sub",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "background_register",
            "parent_key": "background",
            "title": "背景画像を登録する",
            "task_type": "background_sub",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "background_apply",
            "parent_key": "background",
            "title": "背景を適用する",
            "task_type": "background_sub",
            "scene_id": scene_id,
            "priority": "低",
            "status": "未着手",
        },

        {
            "key": "asset",
            "parent_key": "scene_group",
            "title": "素材",
            "task_type": "asset",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "asset_search",
            "parent_key": "asset",
            "title": "メイン素材を探す",
            "task_type": "asset_sub",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },
        {
            "key": "asset_register",
            "parent_key": "asset",
            "title": "メイン素材を登録する",
            "task_type": "asset_sub",
            "scene_id": scene_id,
            "priority": "中",
            "status": "未着手",
        },

        {
            "key": "edit",
            "parent_key": "scene_group",
            "title": "編集",
            "task_type": "edit",
            "scene_id": scene_id,
            "priority": "高",
            "status": "未着手",
        },
        {
            "key": "review",
            "parent_key": "scene_group",
            "title": "確認",
            "task_type": "review",
            "scene_id": scene_id,
            "priority": "低",
            "status": "未着手",
        },
    ]