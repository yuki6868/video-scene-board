from fastapi import FastAPI
from app.routers import health

from app.api.scene import router as scene_router
from app.db.database import Base, engine
from app.models.scene import Scene

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(scene_router)

@app.get("/")
def read_root():
    return {"message": "Video Scene Board API"}

# router登録
app.include_router(health.router)