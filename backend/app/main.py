import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.calendar_entries import router as calendar_entries_router
from app.routes.flowers import router as flowers_router
from app.routes.activities import router as activities_router
from app.routes.dashboard import router as dashboard_router
from app.routes.vegetables import router as vegetables_router
from app.routes.natives import router as natives_router
from app.routes.analytics import router as analytics_router
from app.middleware.activity_logger import ActivityLoggerMiddleware

app = FastAPI(
    title="Flower Garden Project",
    description="Auckland, NZ cut flower gardening planner and tracker",
    version="1.0.0",
)

allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")

app.add_middleware(ActivityLoggerMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(calendar_entries_router)
app.include_router(flowers_router)
app.include_router(activities_router)
app.include_router(dashboard_router)
app.include_router(vegetables_router)
app.include_router(natives_router)
app.include_router(analytics_router)


@app.get("/health")
def health():
    return {"status": "ok"}
