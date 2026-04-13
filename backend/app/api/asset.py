from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import UploadFile, File, Form
from sqlalchemy.orm import Session
import os
import uuid

from app.dependencies.db import get_db
from app.models.asset import Asset
from app.models.scene import Scene
from app.models.task import Task
from app.models.video import Video
from app.schemas.asset import AssetCreate, AssetResponse, AssetUpdate
from app.schemas.task import TaskResponse
from app.services.task_sync import recalculate_parent_task_status
from app.services.task_order import get_next_task_sort_order

router = APIRouter(prefix="/assets", tags=["assets"])

BASE_UPLOAD_DIR = "uploads"


def get_subdir(asset_type: str):
    if asset_type == "audio":
        return "audio"
    elif asset_type == "background":
        return "images"
    elif asset_type == "se":
        return "se"
    else:
        return "others"


@router.get("/", response_model=List[AssetResponse])
def list_assets(
    video_id: Optional[int] = Query(default=None),
    scene_id: Optional[int] = Query(default=None),
    asset_type: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Asset)

    if video_id is not None:
        query = query.filter(Asset.video_id == video_id)

    if scene_id is not None:
        query = query.filter(Asset.scene_id == scene_id)

    if asset_type is not None:
        query = query.filter(Asset.asset_type == asset_type)

    if status is not None:
        query = query.filter(Asset.status == status)

    assets = query.order_by(Asset.id.desc()).all()
    return assets


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.post("/", response_model=AssetResponse, status_code=201)
def create_asset(
    video_id: int = Form(...),
    scene_id: int | None = Form(None),
    title: str = Form(...),
    asset_type: str = Form(...),
    status: str = Form(...),
    location_type: str = Form(...),
    path_or_url: str = Form(""),
    source_note: str = Form(""),
    memo: str = Form(""),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    path = path_or_url or None

    if file:
        subdir = get_subdir(asset_type)
        save_dir = os.path.join(BASE_UPLOAD_DIR, subdir)

        os.makedirs(save_dir, exist_ok=True)

        filename = f"{uuid.uuid4()}_{file.filename}"

        file_location = os.path.join(save_dir, filename)
        with open(file_location, "wb") as f:
            f.write(file.file.read())
        path = f"uploads/{subdir}/{filename}"

    asset = Asset(
        video_id=video_id,
        scene_id=scene_id,
        title=title,
        asset_type=asset_type,
        status=status,
        location_type=location_type,
        path_or_url=path,
        source_note=source_note,
        memo=memo,
    )

    db.add(asset)
    db.commit()
    db.refresh(asset)

    return asset


@router.post("/{asset_id}/generate-task", response_model=TaskResponse, status_code=201)
def generate_task_from_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    existing_task = db.query(Task).filter(Task.asset_id == asset.id).first()
    if existing_task is not None:
        return existing_task

    detail_lines = [
        f"素材種別: {asset.asset_type}",
        f"素材状態: {asset.status}",
    ]

    if asset.path_or_url:
        detail_lines.append(f"パス/URL: {asset.path_or_url}")

    if asset.memo:
        detail_lines.append(f"メモ: {asset.memo}")

    # 素材種類ごとにタイトル / task_type / 親タスク種別を決める
    if asset.asset_type == "audio":
        task_title = f"ナレーション作成: {asset.title}"
        task_type = "音声"
        parent_task_type = "voice"
    elif asset.asset_type == "background":
        task_title = f"背景配置: {asset.title}"
        task_type = "背景"
        parent_task_type = "background"
    elif asset.asset_type == "se":
        task_title = f"効果音追加: {asset.title}"
        task_type = "SE"
        parent_task_type = "asset"
    else:
        task_title = f"素材対応: {asset.title}"
        task_type = "素材"
        parent_task_type = "asset"

    parent_task = (
        db.query(Task)
        .filter(
            Task.scene_id == asset.scene_id,
            Task.task_type == parent_task_type
        )
        .first()
    )
    resolved_parent_task_id = parent_task.id if parent_task else None

    task = Task(
        video_id=asset.video_id,
        scene_id=asset.scene_id,
        asset_id=asset.id,
        parent_task_id=resolved_parent_task_id,
        title=task_title,
        detail="\n".join(detail_lines),
        task_type=task_type,
        priority="中",
        status="未着手",
        sort_order=get_next_task_sort_order(db, asset.video_id, resolved_parent_task_id),
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    if task.parent_task_id is not None:
        recalculate_parent_task_status(db, task.parent_task_id)
        db.commit()
        db.refresh(task)

    return task


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: int,
    video_id: int | None = Form(None),
    scene_id: int | None = Form(None),
    asset_type: str | None = Form(None),
    title: str | None = Form(None),
    status: str | None = Form(None),
    location_type: str | None = Form(None),
    path_or_url: str | None = Form(None),
    relative_path: str | None = Form(None),
    source_note: str | None = Form(None),
    search_keyword: str | None = Form(None),
    memo: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    old_scene_id = asset.scene_id
    old_path = asset.path_or_url
    old_asset_type = asset.asset_type

    update_data = {
        "video_id": video_id,
        "scene_id": scene_id,
        "asset_type": asset_type,
        "title": title,
        "status": status,
        "location_type": location_type,
        "path_or_url": path_or_url,
        "relative_path": relative_path,
        "source_note": source_note,
        "search_keyword": search_keyword,
        "memo": memo,
    }

    update_data = {k: v for k, v in update_data.items() if v is not None}

    next_video_id = update_data.get("video_id", asset.video_id)
    next_scene_id = update_data.get("scene_id", asset.scene_id)

    video = db.query(Video).filter(Video.id == next_video_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    if next_scene_id is not None:
        scene = db.query(Scene).filter(Scene.id == next_scene_id).first()
        if scene is None:
            raise HTTPException(status_code=404, detail="Scene not found")
        if scene.video_id != next_video_id:
            raise HTTPException(status_code=400, detail="Scene does not belong to the specified video")

    # ファイルアップロードがある場合は保存して path_or_url を上書き
    if file:
        target_asset_type = update_data.get("asset_type", asset.asset_type)
        subdir = get_subdir(target_asset_type)
        save_dir = os.path.join(BASE_UPLOAD_DIR, subdir)
        os.makedirs(save_dir, exist_ok=True)

        filename = f"{uuid.uuid4()}_{file.filename}"
        file_location = os.path.join(save_dir, filename)

        with open(file_location, "wb") as f:
            f.write(file.file.read())

        update_data["path_or_url"] = f"uploads/{subdir}/{filename}"
        update_data["location_type"] = "local"

    for key, value in update_data.items():
        setattr(asset, key, value)

    # 旧シーン側の背景解除
    if old_asset_type == "background" and old_scene_id is not None:
        old_scene = db.query(Scene).filter(Scene.id == old_scene_id).first()
        if old_scene is not None and old_scene.background_path == old_path:
            if (
                asset.scene_id != old_scene_id
                or asset.asset_type != "background"
                or asset.status != "ready"
                or asset.path_or_url != old_path
            ):
                old_scene.background_path = None

    # 新シーン側へ背景反映
    if asset.asset_type == "background" and asset.scene_id is not None:
        scene = db.query(Scene).filter(Scene.id == asset.scene_id).first()
        if scene is not None:
            if asset.status == "ready" and asset.path_or_url:
                scene.background_path = asset.path_or_url
            elif scene.background_path == asset.path_or_url:
                scene.background_path = None

    # 素材に紐づくタスクも同期
    linked_task = db.query(Task).filter(Task.asset_id == asset.id).first()
    if linked_task is not None:
        if asset.status == "ready":
            linked_task.status = "完了"
        elif asset.status in ["creating", "searching"]:
            linked_task.status = "作業中"
        else:
            linked_task.status = "未着手"

    db.commit()

    if linked_task is not None and linked_task.parent_task_id is not None:
        recalculate_parent_task_status(db, linked_task.parent_task_id)
        db.commit()

    db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    db.delete(asset)
    db.commit()
    return None