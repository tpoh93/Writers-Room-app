"""Deterministic fixture controls for a single writer-card PUT response."""

from __future__ import annotations

import asyncio
import re
from typing import Awaitable, Callable, Literal

from fastapi import APIRouter, FastAPI
from fastapi.requests import Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware


FaultKind = Literal["http-500"]
WRITER_CARD_PATH = re.compile(r"/api/cards/[1-9][0-9]*")


class WriterPutFaultController:
    """Owns one fixture-only fault and exposes a JSON-safe status snapshot."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._armed: FaultKind | None = None

    async def arm_http_500(self) -> dict[str, object]:
        return await self._arm("http-500")

    async def clear(self) -> dict[str, object]:
        async with self._lock:
            self._armed = None
            return self._status_locked()

    async def status(self) -> dict[str, object]:
        async with self._lock:
            return self._status_locked()

    async def intercept(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.method != "PUT" or WRITER_CARD_PATH.fullmatch(request.url.path) is None:
            return await call_next(request)

        fault = await self._consume_writer_fault()
        if fault is None:
            return await call_next(request)
        if fault == "http-500":
            return JSONResponse(status_code=500, content={"detail": "fixture writer PUT fault"})

        return await call_next(request)

    async def _arm(self, fault: FaultKind) -> dict[str, object]:
        async with self._lock:
            self._armed = fault
            return self._status_locked()

    async def _consume_writer_fault(self) -> FaultKind | None:
        async with self._lock:
            fault = self._armed
            self._armed = None
            return fault

    def _status_locked(self) -> dict[str, object]:
        return {
            "enabled": True,
            "armed": self._armed or "none",
            "requestState": "idle",
            "delaySeconds": None,
        }


class WriterPutFaultMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: FastAPI, controller: WriterPutFaultController) -> None:
        super().__init__(app)
        self._controller = controller

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        return await self._controller.intercept(request, call_next)


def install_writer_put_fault_controls(app: FastAPI, *, api_prefix: str) -> WriterPutFaultController:
    """Mount the acceptance controls on an explicitly opted-in FastAPI app."""

    controller = WriterPutFaultController()
    router = APIRouter(prefix=f"{api_prefix}/acceptance/writer-put-fault")

    @router.get("")
    async def fault_status() -> dict[str, object]:
        return await controller.status()

    @router.post("/http-500")
    async def fault_http_500() -> dict[str, object]:
        return await controller.arm_http_500()

    @router.delete("")
    async def fault_clear() -> dict[str, object]:
        return await controller.clear()

    app.include_router(router)
    app.add_middleware(WriterPutFaultMiddleware, controller=controller)
    return controller
