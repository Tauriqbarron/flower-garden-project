import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.flowers import router as flowers_router
from app.routes.activities import router as activities_router
from app.routes.dashboard import router as dashboard_router
from app.routes.vegetables import router as vegetables_router

app = FastAPI(
    title="Flower Garden Project",
    description="Auckland, NZ cut flower gardening planner and tracker",
    version="1.0.0",
)

allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(flowers_router)
app.include_router(activities_router)
app.include_router(dashboard_router)
app.include_router(vegetables_router)


@app.get("/health")
def health():
    return {"status": "ok"}
