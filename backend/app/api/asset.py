from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import UploadFile, File, Form
from sqlalchemy.orm import Session
import os
import uuid

from app.dependencies.db import get_db
from app.models.asset import Asset
from app.models.scene import Scene
from app.models.video import Video
from app.schemas.asset import AssetCreate, AssetResponse, AssetUpdate

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
    memo: str = Form(""),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    path = None

    if file:
        subdir = get_subdir(asset_type)
        save_dir = os.path.join(BASE_UPLOAD_DIR, subdir)

        os.makedirs(save_dir, exist_ok=True)

        filename = f"{uuid.uuid4()}_{file.filename}"

        file_location = os.path.join(save_dir, filename)
        with open(file_location, "wb") as f:
            f.write(file.file.read())
        path = f"{subdir}/{filename}"

    asset = Asset(
        video_id=video_id,
        scene_id=scene_id,
        title=title,
        asset_type=asset_type,
        status=status,
        location_type=location_type,
        path_or_url=path,
        memo=memo,
    )

    db.add(asset)
    db.commit()
    db.refresh(asset)

    return asset


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(asset_id: int, asset_in: AssetUpdate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    update_data = asset_in.model_dump(exclude_unset=True)

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

    for key, value in update_data.items():
        setattr(asset, key, value)

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