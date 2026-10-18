"""HTTP conditional caching (ETag) for read-only JSON endpoints.

The browser revalidates with If-None-Match; when the data is unchanged the server answers 304 with no body.
`private, no-cache` means "you may keep a copy, but ask me first", so users never see another user's data
or stale data, and nothing is stored in shared caches.
"""
import hashlib

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

CACHEABLE_PREFIXES = ("/api/me/", "/api/workout/", "/api/chats")


def make_etag(body: bytes) -> str:
    return '"' + hashlib.blake2b(body, digest_size=16).hexdigest() + '"'


class ETagMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if (
            request.method != "GET"
            or response.status_code != 200
            or not request.url.path.startswith(CACHEABLE_PREFIXES)
        ):
            return response

        body = b"".join([chunk async for chunk in response.body_iterator])
        etag = make_etag(body)
        cache_headers = {"ETag": etag, "Cache-Control": "private, no-cache", "Vary": "Authorization"}

        if request.headers.get("if-none-match") == etag:
            return Response(status_code=304, headers=cache_headers)

        headers = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}
        headers.update(cache_headers)
        return Response(content=body, status_code=200, headers=headers, media_type=response.media_type)
