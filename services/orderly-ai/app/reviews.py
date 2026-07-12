"""C2 — review reply drafts (human approve before send)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from .config import settings


def _dir() -> Path:
    path = Path(settings.data_dir) / "review_drafts"
    path.mkdir(parents=True, exist_ok=True)
    return path


def create_review_draft(
    *,
    tenant_id: str,
    platform: str,
    rating: int,
    review_text: str,
    reviewer_name: str | None,
) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    stars = max(1, min(5, int(rating)))
    if stars >= 4:
        kind = "positive"
        draft_reply = (
            f"Thank you{(' ' + reviewer_name) if reviewer_name else ''}! "
            "We're glad you enjoyed your visit — we hope to see you again soon."
        )
        auto_ok = True
    elif stars <= 2:
        kind = "negative"
        draft_reply = (
            f"We're sorry your experience fell short"
            f"{(', ' + reviewer_name) if reviewer_name else ''}. "
            "Please contact us directly so we can make this right — "
            "we take this seriously and want to help."
        )
        auto_ok = False
    else:
        kind = "neutral"
        draft_reply = (
            "Thank you for the feedback. We're always working to improve "
            "and appreciate you taking the time to share."
        )
        auto_ok = False

    draft = {
        "id": str(uuid4()),
        "tenant_id": tenant_id,
        "platform": platform,
        "rating": stars,
        "kind": kind,
        "review_text": review_text,
        "reviewer_name": reviewer_name,
        "draft_reply": draft_reply,
        "status": "pending_human",
        "auto_send_allowed": auto_ok,
        "alert_owner": stars <= 2,
        "created_at": now,
        "updated_at": now,
        "approved_by": None,
        "sent_at": None,
        "note": (
            "Negative reviews never auto-send. Human must approve. "
            "Platform send adapters (Google/Facebook) wire after OAuth."
        ),
    }
    (_dir() / f"{draft['id']}.json").write_text(
        json.dumps(draft, indent=2), encoding="utf-8"
    )
    return draft


def get_review_draft(draft_id: str) -> dict | None:
    path = _dir() / f"{draft_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def list_review_drafts(tenant_id: str | None = None) -> list[dict]:
    rows: list[dict] = []
    for path in sorted(_dir().glob("*.json"), reverse=True):
        try:
            row = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if tenant_id and row.get("tenant_id") != tenant_id:
            continue
        rows.append(row)
    return rows


def approve_review_draft(
    draft_id: str, *, approved_by: str, edited_reply: str | None
) -> dict:
    draft = get_review_draft(draft_id)
    if not draft:
        raise KeyError("not found")
    if draft.get("status") == "approved_ready":
        return draft
    draft["draft_reply"] = edited_reply or draft.get("draft_reply")
    draft["approved_by"] = approved_by
    draft["status"] = "approved_ready"
    draft["updated_at"] = datetime.now(timezone.utc).isoformat()
    draft["note"] = (
        "Human-approved. Outbound Google/Facebook send not wired yet — "
        "copy reply manually or connect OAuth adapters next."
    )
    (_dir() / f"{draft_id}.json").write_text(
        json.dumps(draft, indent=2), encoding="utf-8"
    )
    return draft
