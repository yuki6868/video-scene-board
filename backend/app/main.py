from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.asset import router as asset_router
from app.api.scene import router as scene_router
from app.api.task import router as task_router
from app.api.video import router as video_router
from app.api.voice_asset import router as voice_asset_router
from app.db.database import Base, engine
from app.models.asset import Asset
from app.models.scene import Scene
from app.models.task import Task
from app.models.video import Video
from app.models.voice_asset import VoiceAsset

def column_exists(conn, table, column):
    result = conn.execute(text(f"PRAGMA table_info({table})"))
    columns = [row[1] for row in result]
    return column in columns

def migrate_video_columns(engine):
    with engine.connect() as conn:
        columns_to_add = {
            "thumbnail_url": "TEXT",
            "description": "TEXT",
            "tags": "TEXT",
            "video_path": "TEXT",
            "youtube_url": "TEXT",
            "youtube_id": "TEXT",
            "published_at": "TEXT",
            "concept": "TEXT",
            "target": "TEXT",
            "goal": "TEXT",
            "status": "VARCHAR(50) DEFAULT 'draft' NOT NULL",
            "aspect_ratio": "VARCHAR(20) DEFAULT '9:16' NOT NULL",
            "frame_width": "INTEGER DEFAULT 1080 NOT NULL",
            "frame_height": "INTEGER DEFAULT 1920 NOT NULL",
        }

        for column_name, column_type in columns_to_add.items():
            if not column_exists(conn, "videos", column_name):
                conn.execute(
                    text(f"ALTER TABLE videos ADD COLUMN {column_name} {column_type}")
                )

        conn.commit()

def migrate_task_parent_column(engine):
    with engine.connect() as conn:
        columns = [row[1] for row in conn.execute(text("PRAGMA table_info(tasks)")).fetchall()]
        if "parent_task_id" not in columns:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER"))
            conn.commit()

def migrate_scene_columns():
    with engine.connect() as conn:
        statements = [
            "ALTER TABLE scenes ADD COLUMN section_type VARCHAR(50)",
            "ALTER TABLE scenes ADD COLUMN status VARCHAR(50) DEFAULT '未着手' NOT NULL",
            "ALTER TABLE scenes ADD COLUMN duration_seconds INTEGER",
            "ALTER TABLE scenes ADD COLUMN audio_path VARCHAR(500)",
            "ALTER TABLE scenes ADD COLUMN character_name VARCHAR(255)",
            "ALTER TABLE scenes ADD COLUMN character_expression VARCHAR(255)",
            "ALTER TABLE scenes ADD COLUMN background_path VARCHAR(500)",
            "ALTER TABLE scenes ADD COLUMN background_fit_mode VARCHAR(50) DEFAULT 'cover' NOT NULL",
            "ALTER TABLE scenes ADD COLUMN se_path VARCHAR(500)",
            "ALTER TABLE scenes ADD COLUMN telop TEXT",
            "ALTER TABLE scenes ADD COLUMN direction TEXT",
            "ALTER TABLE scenes ADD COLUMN edit_note TEXT",
        ]

        for stmt in statements:
            try:
                conn.execute(text(stmt))
                print(f"OK: {stmt}")
            except Exception as e:
                message = str(e)
                if "duplicate column name" in message:
                    print(f"SKIP: {stmt}")
                else:
                    print(f"ERROR: {stmt} -> {e}")

        conn.commit()


def migrate_task_columns():
    with engine.connect() as conn:
        statements = [
            "ALTER TABLE tasks ADD COLUMN asset_id INTEGER",
        ]

        for stmt in statements:
            try:
                conn.execute(text(stmt))
                print(f"OK: {stmt}")
            except Exception as e:
                message = str(e)
                if "duplicate column name" in message:
                    print(f"SKIP: {stmt}")
                else:
                    print(f"ERROR: {stmt} -> {e}")

        conn.commit()

def migrate_voice_assets_table(engine):
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS voice_assets (
                id INTEGER PRIMARY KEY,
                scene_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                style_id INTEGER NOT NULL,
                character_name TEXT NOT NULL,
                style_name TEXT NOT NULL,
                speed REAL NOT NULL DEFAULT 1.0,
                pitch REAL NOT NULL DEFAULT 0.0,
                intonation REAL NOT NULL DEFAULT 1.0,
                volume REAL NOT NULL DEFAULT 1.0,
                audio_path TEXT,
                subtitle_png_path TEXT,
                is_selected BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(scene_id) REFERENCES scenes(id) ON DELETE CASCADE
            )
        """))
        conn.commit()

def remove_duplicate_tasks(engine):

    with Session(engine) as session:
        tasks = session.query(Task).all()

        seen = set()
        duplicates = []

        for task in tasks:
            key = (task.scene_id, task.title, task.parent_task_id)
            if key in seen:
                duplicates.append(task)
            else:
                seen.add(key)

        for task in duplicates:
            session.delete(task)

        session.commit()

def migrate_existing_tasks_to_parent(engine):

    with Session(engine) as session:
        # 全タスク取得
        tasks = session.query(Task).all()

        # シーンごとに処理
        scene_map = {}
        for task in tasks:
            scene_map.setdefault(task.scene_id, []).append(task)

        for scene_id, scene_tasks in scene_map.items():
            # 親タスクを取得
            parent_map = {
                "voice": None,
                "background": None,
                "asset": None,
            }

            for task in scene_tasks:
                if task.task_type in parent_map:
                    parent_map[task.task_type] = task

            # 子タスクを親に紐づける
            for task in scene_tasks:
                if task.parent_task_id is not None:
                    continue  # すでに正しい

                if task.task_type == "voice_sub" and parent_map["voice"]:
                    task.parent_task_id = parent_map["voice"].id

                elif task.task_type == "background_sub" and parent_map["background"]:
                    task.parent_task_id = parent_map["background"].id

                elif task.task_type == "asset_sub" and parent_map["asset"]:
                    task.parent_task_id = parent_map["asset"].id

        session.commit()

def backfill_task_asset_links():
    with Session(bind=engine) as db:
        tasks = db.query(Task).filter(Task.asset_id.is_(None)).all()

        linked_count = 0

        for task in tasks:
            if not task.title:
                continue

            asset_title = None
            task_type = None

            if task.title.startswith("素材対応: "):
                asset_title = task.title.replace("素材対応: ", "", 1).strip()
                task_type = "素材"
            elif task.title.startswith("ナレーション作成: "):
                asset_title = task.title.replace("ナレーション作成: ", "", 1).strip()
                task_type = "音声"
            elif task.title.startswith("背景配置: "):
                asset_title = task.title.replace("背景配置: ", "", 1).strip()
                task_type = "背景"
            elif task.title.startswith("効果音追加: "):
                asset_title = task.title.replace("効果音追加: ", "", 1).strip()
                task_type = "SE"

            if asset_title is None:
                continue

            query = db.query(Asset).filter(
                Asset.video_id == task.video_id,
                Asset.title == asset_title,
            )

            if task.scene_id is not None:
                query = query.filter(Asset.scene_id == task.scene_id)

            asset = query.first()

            if asset is None and task.scene_id is not None:
                asset = db.query(Asset).filter(
                    Asset.video_id == task.video_id,
                    Asset.title == asset_title,
                ).first()

            if asset is None:
                continue

            task.asset_id = asset.id

            if task_type is not None:
                task.task_type = task_type

            linked_count += 1

        db.commit()
        print(f"BACKFILL TASK-ASSET LINKS: {linked_count} tasks linked")

migrate_voice_assets_table(engine)
Base.metadata.create_all(bind=engine)
migrate_task_parent_column(engine)
migrate_existing_tasks_to_parent(engine)
remove_duplicate_tasks(engine)
migrate_video_columns(engine)
migrate_scene_columns()
migrate_task_columns()
backfill_task_asset_links()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(asset_router)
app.include_router(scene_router)
app.include_router(video_router)
app.include_router(task_router)
app.include_router(voice_asset_router)

app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Video Scene Board API"}