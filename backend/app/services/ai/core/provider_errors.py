"""Privacy-safe provider error types shared by workflow boundaries."""

import asyncio
from typing import TypeGuard


class ProviderTimeoutError(asyncio.TimeoutError):
    """A provider request exceeded its allowed time."""

    code = "provider_timeout"
    message = "Provider timeout"

    def __init__(self) -> None:
        super().__init__(self.message)


class ProviderRequestError(RuntimeError):
    """A provider request failed for a non-timeout reason."""

    code = "provider_error"
    message = "Provider request failed"

    def __init__(self) -> None:
        super().__init__(self.message)


ProviderDomainError = ProviderTimeoutError | ProviderRequestError


def is_provider_domain_error(error: BaseException) -> TypeGuard[ProviderDomainError]:
    """Return whether an exception already carries the safe provider contract."""

    return isinstance(error, (ProviderTimeoutError, ProviderRequestError))


def safe_provider_error(error: ProviderDomainError) -> dict[str, str]:
    """Return only the stable public fields associated with a provider error."""

    if isinstance(error, ProviderTimeoutError):
        return {
            "code": ProviderTimeoutError.code,
            "message": ProviderTimeoutError.message,
        }
    if isinstance(error, ProviderRequestError):
        return {
            "code": ProviderRequestError.code,
            "message": ProviderRequestError.message,
        }
    raise TypeError("Expected a provider domain error")
