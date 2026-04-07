from fastapi import FastAPI
from app.routers import health

from app.db.database import Base, engine
from app.models.scene import Scene

Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Video Scene Board API"}

# router登録
app.include_router(health.router)