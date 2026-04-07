from fastapi import FastAPI
from app.routers import health

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "backend is running"}

# router登録
app.include_router(health.router)