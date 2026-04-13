from typing import List, Dict


ASSET_TYPES = {
    "background": "背景素材",
    "voice": "音声素材",
    "main": "メイン素材",
}


from typing import List, Dict


ASSET_TYPES = {
    "background": "背景素材",
    "audio": "音声素材",
    "main": "メイン素材",
}


def get_scene_initial_assets(scene_id: int, video_id: int, scene_position: int) -> List[Dict]:
    """
    シーン作成時に自動生成する初期素材一覧を返す
    """
    return [
        {
            "scene_id": scene_id,
            "video_id": video_id,
            "asset_type": "background",
            "name": f"シーン{scene_position}: 背景素材",
            "status": "未着手",
        },
        {
            "scene_id": scene_id,
            "video_id": video_id,
            "asset_type": "audio",
            "name": f"シーン{scene_position}: 音声素材",
            "status": "未着手",
        },
        {
            "scene_id": scene_id,
            "video_id": video_id,
            "asset_type": "main",
            "name": f"シーン{scene_position}: メイン素材",
            "status": "未着手",
        },
    ]