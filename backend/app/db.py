"""Single Firebase Admin / Firestore initialisation."""
import json
import logging

import firebase_admin
from firebase_admin import credentials, firestore

from .config import settings

log = logging.getLogger("ournold.db")


def _init() -> None:
    try:
        firebase_admin.get_app()
        return
    except ValueError:
        pass

    if settings.firebase_credentials:
        cred = credentials.Certificate(json.loads(settings.firebase_credentials))
    elif settings.firebase_cred_path:
        cred = credentials.Certificate(settings.firebase_cred_path)
    else:
        raise RuntimeError(
            "Firebase credentials missing: set FIREBASE_CREDENTIALS (JSON string) or FIREBASE_CRED_PATH."
        )
    firebase_admin.initialize_app(cred)
    log.info("Firebase initialised")


_db = None


def get_db():
    """Lazy so importing modules (e.g. in unit tests) never needs credentials."""
    global _db
    if _db is None:
        _init()
        _db = firestore.client()
    return _db


def user_ref(uid: str):
    return get_db().collection("users").document(uid)
