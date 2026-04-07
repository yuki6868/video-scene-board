from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.scene import router as scene_router
from app.api.task import router as task_router
from app.api.video import router as video_router
from app.db.database import Base, engine
from app.models.scene import Scene
from app.models.task import Task
from app.models.video import Video


def migrate_video_columns():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE videos ADD COLUMN concept TEXT"))
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE videos ADD COLUMN target TEXT"))
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE videos ADD COLUMN goal TEXT"))
        except Exception:
            pass

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


Base.metadata.create_all(bind=engine)
migrate_video_columns()
migrate_scene_columns()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scene_router)
app.include_router(video_router)
app.include_router(task_router)


@app.get("/")
def read_root():
    return {"message": "Video Scene Board API"}