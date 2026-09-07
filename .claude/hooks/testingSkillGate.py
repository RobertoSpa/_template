#!/usr/bin/env python3
"""PreToolUse hook: refuse a write to a test file until the testing skill loads.

The lint rules and the other hooks refuse an incorrect test. None of them
teaches the shape of a correct one. This gate is the counterpart: it costs one
round trip and it puts the rules in context before the first test of a task.

The proof is the transcript, which only grows. One scan that finds the skill
holds for the whole session. Nothing is written after a denial, because a mark
that a denial clears lets the identical retry through.

Exit 0 = allowed or not a test write. Exit 0 with a deny payload = blocked.
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

LOG = Path.home() / ".local" / "state" / "script-logs" / "testing-skill-gate.log"
LOG_LINES_MAX = 2000
TRANSCRIPT_BYTES_MAX = 64 * 1024 * 1024

TEST = re.compile(r"\.(?:test|spec)\.tsx?$|\.integration\.ts$")
WRITE_TOOLS = ("Write", "Edit", "NotebookEdit")
LOADED = re.compile(r'"skill"\s*:\s*"testing"')

REASON = """Blocked: the testing skill is not loaded in this session.

Call Skill(testing) now. Then write the test against its rules on Nullables,
the four pillars, the public API, DAMP style, and the assertions that name the
value that you want.

This is a gate, not a formality. The identical call is blocked again."""


def log(message: str) -> None:
    try:
        LOG.parent.mkdir(parents=True, exist_ok=True)
        with LOG.open("a") as handle:
            handle.write(message.rstrip() + "\n")
        lines = LOG.read_text().splitlines()
        if len(lines) > LOG_LINES_MAX:
            LOG.write_text("\n".join(lines[-LOG_LINES_MAX:]) + "\n")
    except OSError:
        pass  # logging must never break the hook


def skill_is_in_transcript(path: Path) -> bool:
    assert path.is_file()

    read = 0

    with path.open(errors="replace") as transcript:
        for line in transcript:
            read += len(line)

            if read > TRANSCRIPT_BYTES_MAX:
                log(f"{datetime.now().isoformat(timespec='seconds')} WARN transcript over budget")

                return True  # a transcript this long outlived the gate

            if LOADED.search(line):
                return True

    assert read >= 0

    return False


def skill_is_loaded(transcript_path: str) -> bool:
    path = Path(transcript_path).expanduser()

    if not path.is_file():
        return False

    try:
        return skill_is_in_transcript(path)
    except OSError as error:
        log(f"{datetime.now().isoformat(timespec='seconds')} ERROR transcript: {error}")

        return True  # an unreadable transcript must not block every write


def deny() -> None:
    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": REASON,
            }
        },
        sys.stdout,
    )


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as error:
        log(f"{datetime.now().isoformat(timespec='seconds')} ERROR bad payload: {error}")

        return 0

    if payload.get("tool_name", "") not in WRITE_TOOLS:
        return 0

    written = payload.get("tool_input", {}).get("file_path", "")

    if not TEST.search(written):
        return 0

    stamp = datetime.now().isoformat(timespec="seconds")

    if skill_is_loaded(payload.get("transcript_path", "")):
        log(f"{stamp} PASS {written}")

        return 0

    log(f"{stamp} BLOCK {written}")
    deny()

    return 0


if __name__ == "__main__":
    sys.exit(main())
