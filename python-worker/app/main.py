"""FastAPI entrypoint for the python-worker custom code service."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.executor import run_user_code
from app.packages import health_payload, missing_packages


@asynccontextmanager
async def lifespan(_app: FastAPI):
    missing = missing_packages()
    if missing:
        print(
            "[python-worker] missing packages: "
            + ", ".join(missing)
            + ". Run: python -m pip install -r requirements.txt",
            flush=True,
        )
    yield


app = FastAPI(title="python-worker", version="0.1.0", lifespan=lifespan)


class ExecuteLimits(BaseModel):
    timeoutSec: int = Field(default=300, ge=1, le=900)
    maxMemoryMb: int | None = Field(default=None, ge=1)


class ExecuteRequest(BaseModel):
    code: str
    inputs: list[dict[str, Any]] = Field(default_factory=list)
    limits: ExecuteLimits | None = None


@app.get("/health")
def health() -> dict:
    return health_payload()


@app.post("/execute")
def execute(request: ExecuteRequest) -> dict[str, Any]:
    timeout_sec = 300
    if request.limits is not None:
        timeout_sec = request.limits.timeoutSec
    return run_user_code(request.code, request.inputs, timeout_sec=timeout_sec)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8091)
