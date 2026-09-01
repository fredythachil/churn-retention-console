import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.data_access import store

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(store.initialise)
    yield


app = FastAPI(
    title="Churn Risk & Retention Console",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    return {"status": "ok"}
