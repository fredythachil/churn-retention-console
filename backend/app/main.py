import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.data_access import store
from app.routes import customers, model
from app.core.logging import request_logging_middleware

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "PATCH"],
    allow_headers=["*"],
)

app.middleware("http")(request_logging_middleware)
app.include_router(model.router)
app.include_router(customers.router)


@app.get("/health")
def health():
    return {"status": "ok"}
