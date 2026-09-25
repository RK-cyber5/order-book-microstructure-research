"""FastAPI entrypoint for the research-api mini-service (port 3031).

Read-only service: it serves the vendored research outputs and exposes no
write endpoints.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import data
from .models import HealthResponse
from .routers.lab import router as lab_router
from .routers.research import router as research_router

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    data.warm_cache()  # load every dataset once, fail fast if missing
    logger.info(
        "research-api: research outputs loaded (research_layer/ is read-only, "
        "serving on port 3031)"
    )
    yield


app = FastAPI(
    title="Order Book Microstructure Lab — Research API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(research_router, prefix="/api")
app.include_router(lab_router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    from research_api.data import verified_metrics
    vm = verified_metrics()
    return HealthResponse(
        status="ok",
        service="research-api",
        dataset="Limit Order Book Research Data",
        valid_l2_states=vm["totals"]["l2_states"],
        sessions=len(vm["sessions"])
    )

try:
    from workers import asgi
    Default = asgi.entrypoint(app)
except ImportError:
    pass
