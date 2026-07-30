"""Deterministic fixture controls for a single writer-card PUT response."""

from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass
from typing import Awaitable, Callable, Literal

from fastapi import APIRouter, FastAPI, Query
from fastapi.requests import Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware


FaultKind = Literal["http-500", "delay", "hold"]
RequestState = Literal["idle", "held"]
WRITER_CARD_PATH = re.compile(r"/api/cards/[1-9][0-9]*")


@dataclass(frozen=True)
class ArmedFault:
    kind: FaultKind
    delay_seconds: float | None = None


class WriterPutFaultController:
    """Owns one fixture-only fault and exposes a JSON-safe status snapshot."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._armed: ArmedFault | None = None
        self._request_state: RequestState = "idle"
        self._release_event: asyncio.Event | None = None

    async def arm_http_500(self) -> dict[str, object]:
        return await self._arm(ArmedFault("http-500"))

    async def arm_delay(self, delay_seconds: float) -> dict[str, object]:
        return await self._arm(ArmedFault("delay", delay_seconds))

    async def arm_hold(self) -> dict[str, object]:
        return await self._arm(ArmedFault("hold"))

    async def release(self) -> dict[str, object]:
        async with self._lock:
            if self._release_event is not None:
                self._release_event.set()
            return self._status_locked()

    async def clear(self) -> dict[str, object]:
        async with self._lock:
            self._armed = None
            if self._release_event is not None:
                self._release_event.set()
            self._release_event = None
            self._request_state = "idle"
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
        if fault.kind == "http-500":
            return JSONResponse(status_code=500, content={"detail": "fixture writer PUT fault"})

        response = await call_next(request)
        if fault.kind == "delay":
            await asyncio.sleep(fault.delay_seconds or 0)
        elif fault.kind == "hold":
            await self._wait_for_release()
        return response

    async def _arm(self, fault: ArmedFault) -> dict[str, object]:
        async with self._lock:
            if self._release_event is not None:
                self._release_event.set()
            self._armed = fault
            self._release_event = None
            self._request_state = "idle"
            return self._status_locked()

    async def _consume_writer_fault(self) -> ArmedFault | None:
        async with self._lock:
            fault = self._armed
            self._armed = None
            if fault is not None and fault.kind == "hold":
                self._release_event = asyncio.Event()
                self._request_state = "held"
            return fault

    async def _wait_for_release(self) -> None:
        async with self._lock:
            release_event = self._release_event
        if release_event is not None:
            await release_event.wait()
        async with self._lock:
            self._release_event = None
            self._request_state = "idle"

    def _status_locked(self) -> dict[str, object]:
        return {
            "enabled": True,
            "armed": self._armed.kind if self._armed is not None else "none",
            "requestState": self._request_state,
            "delaySeconds": self._armed.delay_seconds if self._armed is not None else None,
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

    @router.post("/delay")
    async def fault_delay(seconds: float = Query(gt=0, le=30)) -> dict[str, object]:
        return await controller.arm_delay(seconds)

    @router.post("/hold")
    async def fault_hold() -> dict[str, object]:
        return await controller.arm_hold()

    @router.post("/release")
    async def fault_release() -> dict[str, object]:
        return await controller.release()

    @router.delete("")
    async def fault_clear() -> dict[str, object]:
        return await controller.clear()

    app.include_router(router)
    app.add_middleware(WriterPutFaultMiddleware, controller=controller)
    return controller
