"""One-time migration: move plaintext users/{uid}.gemini_api into the encrypted private/secrets doc.

Usage (from backend/, with .env filled in):
    python -m scripts.migrate_keys           # dry run
    python -m scripts.migrate_keys --apply
Lazy migration also happens automatically the first time each user uses AI features.
"""
import sys

from app import llm
from app.db import get_db


def main(apply: bool) -> None:
    moved = 0
    for doc in get_db().collection("users").stream():
        legacy = (doc.to_dict() or {}).get("gemini_api")
        if not legacy:
            continue
        print(("migrating " if apply else "would migrate ") + doc.id)
        if apply:
            llm.store_user_key(doc.id, legacy)
        moved += 1
    print(f"{moved} user(s) {'migrated' if apply else 'pending'}")


if __name__ == "__main__":
    main("--apply" in sys.argv)
