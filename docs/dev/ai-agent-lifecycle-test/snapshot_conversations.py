#!/usr/bin/env python3
"""Snapshot insight-studio AI conversations for agent audit (no secrets)."""
from __future__ import annotations

import json
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path

DB = Path("/workspace/insight-api-go/data/insight.sqlite")
OUT = Path("/workspace/docs/dev/ai-agent-lifecycle-test/audit-snapshots")
OUT.mkdir(parents=True, exist_ok=True)
LOG = OUT / "timeline.jsonl"

SKIP_KEYS = {"apiKey", "api_key", "authorization"}


def clip(s: str, n: int = 4000) -> str:
    s = s or ""
    return s if len(s) <= n else s[:n] + f"\n…(clip {len(s)} chars)"


def summarize_messages(raw: str) -> list[dict]:
    try:
        msgs = json.loads(raw) if raw else []
    except json.JSONDecodeError:
        return [{"error": "invalid_json", "len": len(raw or "")}]
    out = []
    for i, m in enumerate(msgs if isinstance(msgs, list) else []):
        if not isinstance(m, dict):
            continue
        role = m.get("role")
        name = m.get("name")
        content = m.get("content")
        if isinstance(content, list):
            text = "\n".join(
                p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"
            )
        else:
            text = content if isinstance(content, str) else ""
        tcs = m.get("tool_calls") or []
        tools = []
        for tc in tcs:
            fn = (tc.get("function") or {}) if isinstance(tc, dict) else {}
            tools.append(
                {
                    "name": fn.get("name"),
                    "args_preview": clip(str(fn.get("arguments") or ""), 500),
                }
            )
        item = {
            "i": i,
            "role": role,
            "name": name,
            "content_len": len(text or ""),
            "content_preview": clip(text, 800),
            "tool_calls": tools,
        }
        if m.get("tool_call_id"):
            item["tool_call_id"] = m.get("tool_call_id")
        out.append(item)
    return out


def snapshot() -> dict | None:
    if not DB.exists():
        return None
    con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    rows = con.execute(
        "SELECT id, title, analysis_id, created_at, updated_at, length(messages) AS msg_bytes, messages FROM ai_conversations ORDER BY updated_at DESC LIMIT 5"
    ).fetchall()
    analyses = []
    try:
        analyses = [
            dict(r)
            for r in con.execute(
                "SELECT id, name FROM analyses ORDER BY updated_at DESC LIMIT 10"
            ).fetchall()
        ]
    except Exception:
        pass
    convs = []
    for r in rows:
        convs.append(
            {
                "id": r["id"],
                "title": r["title"],
                "analysis_id": r["analysis_id"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
                "msg_bytes": r["msg_bytes"],
                "messages": summarize_messages(r["messages"]),
            }
        )
    con.close()
    return {
        "ts": datetime.now(timezone.utc).isoformat(),
        "analyses": analyses,
        "conversations": convs,
    }


def main() -> None:
    last_sig = None
    while True:
        try:
            snap = snapshot()
        except Exception as e:
            snap = {"ts": datetime.now(timezone.utc).isoformat(), "error": str(e)}
        if snap:
            sig = json.dumps(
                [
                    (c.get("id"), c.get("updated_at"), c.get("msg_bytes"), len(c.get("messages") or []))
                    for c in (snap.get("conversations") or [])
                ],
                ensure_ascii=False,
            )
            if sig != last_sig:
                last_sig = sig
                with LOG.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(snap, ensure_ascii=False) + "\n")
                ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
                (OUT / f"snap-{ts}.json").write_text(
                    json.dumps(snap, ensure_ascii=False, indent=2), encoding="utf-8"
                )
                print(snap["ts"], "wrote snapshot", flush=True)
        time.sleep(20)


if __name__ == "__main__":
    main()
