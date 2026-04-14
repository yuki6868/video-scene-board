from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.task_title_sync import sync_task_titles_for_scene

from app.dependencies.db import get_db
from app.models.scene import Scene
from app.services.task_generation import get_scene_initial_tasks
from app.models.task import Task
from app.services.asset_generation import get_scene_initial_assets
from app.models.asset import Asset
from app.models.video import Video
from app.models.voice_asset import VoiceAsset
from app.schemas.scene import (
    SceneCreate,
    SceneResponse,
    SceneReorderItem,
    SceneUpdate,
)

router = APIRouter(tags=["scenes"])


@router.post("/videos/{video_id}/scenes", response_model=SceneResponse)
def create_scene(video_id: int, scene: SceneCreate, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    new_scene = Scene(
        **scene.dict(),
        video_id=video_id
    )
    db.add(new_scene)
    db.commit()
    db.refresh(new_scene)

    initial_tasks = get_scene_initial_tasks(
        scene_id=new_scene.id,
        scene_order=new_scene.position + 1,
        scene_title=new_scene.title,
    )

    created_tasks = {}
    sibling_sort_counters = {}

    for task_data in initial_tasks:
        parent_key = task_data["parent_key"]

        parent_task_id = None
        if parent_key is not None:
            parent_task = created_tasks.get(parent_key)
            if parent_task is None:
                continue
            parent_task_id = parent_task.id

        exists = db.query(Task).filter(
            Task.scene_id == new_scene.id,
            Task.task_type == task_data["task_type"],
            Task.title == task_data["title"],
            Task.parent_task_id == parent_task_id,
        ).first()

        if exists:
            created_tasks[task_data["key"]] = exists
            continue

        sibling_key = (new_scene.video_id, parent_task_id)
        next_sort_order = sibling_sort_counters.get(sibling_key, 0)
        sibling_sort_counters[sibling_key] = next_sort_order + 1

        new_task = Task(
            title=task_data["title"],
            task_type=task_data["task_type"],
            scene_id=task_data["scene_id"],
            video_id=new_scene.video_id,
            priority=task_data["priority"],
            status=task_data["status"],
            parent_task_id=parent_task_id,
            sort_order=next_sort_order,
        )
        db.add(new_task)
        db.flush()
        created_tasks[task_data["key"]] = new_task

    initial_assets = get_scene_initial_assets(
        scene_id=new_scene.id,
        video_id=new_scene.video_id,
        scene_position=new_scene.position + 1
    )

    for asset_data in initial_assets:
        exists = db.query(Asset).filter(
            Asset.scene_id == new_scene.id,
            Asset.asset_type == asset_data["asset_type"]
        ).first()

        if not exists:
            new_asset = Asset(
                scene_id=asset_data["scene_id"],
                video_id=asset_data["video_id"],
                asset_type=asset_data["asset_type"],
                title=asset_data["name"],
                status=asset_data["status"],
            )
            db.add(new_asset)

    db.commit()

    return new_scene


@router.get("/videos/{video_id}/scenes", response_model=list[SceneResponse])
def list_scenes(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    scenes = (
        db.query(Scene)
        .filter(Scene.video_id == video_id)
        .order_by(Scene.position.asc(), Scene.id.asc())
        .all()
    )
    return scenes


@router.get("/scenes/{scene_id}", response_model=SceneResponse)
def get_scene(scene_id: int, db: Session = Depends(get_db)):
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene


@router.put("/videos/{video_id}/scenes/reorder", response_model=list[SceneResponse])
def reorder_scenes(video_id: int, items: list[SceneReorderItem], db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    ids = [item.id for item in items]

    scenes = (
        db.query(Scene)
        .filter(Scene.video_id == video_id, Scene.id.in_(ids))
        .all()
    )
    scene_map = {scene.id: scene for scene in scenes}

    if len(scene_map) != len(items):
        raise HTTPException(status_code=404, detail="Some scenes were not found in this video")

    for item in items:
        scene_map[item.id].position = item.position

    db.commit()

    updated_scenes = (
        db.query(Scene)
        .filter(Scene.video_id == video_id)
        .order_by(Scene.position.asc(), Scene.id.asc())
        .all()
    )

    for scene in updated_scenes:
        sync_task_titles_for_scene(db, scene)

    db.commit()

    return updated_scenes


@router.put("/scenes/{scene_id}", response_model=SceneResponse)
def update_scene(scene_id: int, scene_data: SceneUpdate, db: Session = Depends(get_db)):
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")

    scene.title = scene_data.title
    scene.script = scene_data.script
    scene.materials = scene_data.materials
    scene.position = scene_data.position

    scene.section_type = scene_data.section_type
    scene.status = scene_data.status
    scene.duration_seconds = scene_data.duration_seconds
    scene.audio_path = scene_data.audio_path
    scene.character_name = scene_data.character_name
    scene.character_expression = scene_data.character_expression
    scene.background_path = scene_data.background_path
    scene.background_fit_mode = scene_data.background_fit_mode
    scene.se_path = scene_data.se_path
    scene.telop = scene_data.telop
    scene.direction = scene_data.direction
    scene.edit_note = scene_data.edit_note
    scene.voice_text = scene_data.voice_text
    scene.subtitle_text = scene_data.subtitle_text

    db.commit()
    db.refresh(scene)
    return scene


@router.post("/scenes/{scene_id}/duplicate", response_model=SceneResponse)
def duplicate_scene(scene_id: int, db: Session = Depends(get_db)):
    source_scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if source_scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")

    last_scene = (
        db.query(Scene)
        .filter(Scene.video_id == source_scene.video_id)
        .order_by(Scene.position.desc(), Scene.id.desc())
        .first()
    )

    next_position = 0 if last_scene is None else last_scene.position + 1

    duplicated_scene = Scene(
        video_id=source_scene.video_id,
        title=f"{source_scene.title}（複製）",
        script=source_scene.script,
        materials=source_scene.materials,
        position=next_position,
        section_type=source_scene.section_type,
        status=source_scene.status,
        duration_seconds=source_scene.duration_seconds,
        audio_path=source_scene.audio_path,
        character_name=source_scene.character_name,
        character_expression=source_scene.character_expression,
        background_path=source_scene.background_path,
        background_fit_mode=source_scene.background_fit_mode,
        se_path=source_scene.se_path,
        telop=source_scene.telop,
        direction=source_scene.direction,
        edit_note=source_scene.edit_note,
        voice_text=source_scene.voice_text,
        subtitle_text=source_scene.subtitle_text,
    )

    db.add(duplicated_scene)
    db.flush()

    source_assets = (
        db.query(Asset)
        .filter(Asset.scene_id == source_scene.id)
        .order_by(Asset.id.asc())
        .all()
    )

    asset_id_map = {}

    for asset in source_assets:
        duplicated_asset = Asset(
            video_id=source_scene.video_id,
            scene_id=duplicated_scene.id,
            asset_type=asset.asset_type,
            title=asset.title,
            status=asset.status,
            location_type=asset.location_type,
            path_or_url=asset.path_or_url,
            relative_path=asset.relative_path,
            source_note=asset.source_note,
            search_keyword=asset.search_keyword,
            memo=asset.memo,
            is_credit_target=asset.is_credit_target,
            is_auto_generated=asset.is_auto_generated,
        )
        db.add(duplicated_asset)
        db.flush()
        asset_id_map[asset.id] = duplicated_asset.id

    source_voice_assets = (
        db.query(VoiceAsset)
        .filter(VoiceAsset.scene_id == source_scene.id)
        .order_by(VoiceAsset.id.asc())
        .all()
    )

    for voice_asset in source_voice_assets:
        duplicated_voice_asset = VoiceAsset(
            scene_id=duplicated_scene.id,
            text=voice_asset.text,
            voice_text=voice_asset.voice_text,
            subtitle_text=voice_asset.subtitle_text,
            style_id=voice_asset.style_id,
            character_name=voice_asset.character_name,
            style_name=voice_asset.style_name,
            speed=voice_asset.speed,
            pitch=voice_asset.pitch,
            intonation=voice_asset.intonation,
            volume=voice_asset.volume,
            audio_path=voice_asset.audio_path,
            subtitle_png_path=voice_asset.subtitle_png_path,
            is_selected=voice_asset.is_selected,
        )
        db.add(duplicated_voice_asset)

    source_tasks = (
        db.query(Task)
        .filter(Task.scene_id == source_scene.id)
        .order_by(Task.sort_order.asc(), Task.id.asc())
        .all()
    )

    task_id_map = {}

    for task in source_tasks:
        duplicated_task = Task(
            video_id=source_scene.video_id,
            scene_id=duplicated_scene.id,
            asset_id=asset_id_map.get(task.asset_id),
            parent_task_id=None,
            title=task.title,
            detail=task.detail,
            task_type=task.task_type,
            priority=task.priority,
            status=task.status,
            sort_order=task.sort_order,
        )
        db.add(duplicated_task)
        db.flush()
        task_id_map[task.id] = duplicated_task.id

    for task in source_tasks:
        if task.parent_task_id is None:
            continue

        duplicated_task_id = task_id_map.get(task.id)
        duplicated_parent_task_id = task_id_map.get(task.parent_task_id)
        if duplicated_task_id is None or duplicated_parent_task_id is None:
            continue

        duplicated_task = db.query(Task).filter(Task.id == duplicated_task_id).first()
        duplicated_task.parent_task_id = duplicated_parent_task_id

    db.commit()
    db.refresh(duplicated_scene)

    return duplicated_scene


@router.delete("/scenes/{scene_id}")
def delete_scene(scene_id: int, db: Session = Depends(get_db)):
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")

    video_id = scene.video_id
    deleted_position = scene.position

    db.query(Task).filter(Task.scene_id == scene_id).delete()
    db.query(Asset).filter(Asset.scene_id == scene_id).delete()

    db.delete(scene)
    db.flush()

    remaining_scenes = (
        db.query(Scene)
        .filter(Scene.video_id == video_id, Scene.position > deleted_position)
        .order_by(Scene.position.asc(), Scene.id.asc())
        .all()
    )

    for remaining_scene in remaining_scenes:
        remaining_scene.position -= 1

    db.commit()

    updated_scenes = (
        db.query(Scene)
        .filter(Scene.video_id == video_id)
        .order_by(Scene.position.asc(), Scene.id.asc())
        .all()
    )

    for updated_scene in updated_scenes:
        sync_task_titles_for_scene(db, updated_scene)

    db.commit()

    return {"message": "Scene deleted"}