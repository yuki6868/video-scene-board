from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.scene import router as scene_router
from app.api.video import router as video_router
from app.db.database import Base, engine
from app.models.scene import Scene
from app.models.video import Video

Base.metadata.create_all(bind=engine)

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


@app.get("/")
def read_root():
    return {"message": "Video Scene Board API"}