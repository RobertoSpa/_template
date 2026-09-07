#!/usr/bin/env python3
"""PreToolUse hook: refuse a write to src/ until a test failed after the last one.

The first law says that no production code is written before a failing test.
The transcript is the only proof available to a hook. A write to a source file
under src/ is allowed when the transcript shows a failing test run later than
the last source write. A test file is never gated, because writing the failing
test is the step that this gate asks for.

The agent chooses which test to run, so this gate is partial. It stops the
common sequence in which the code is written first and the test second.

Exit 0 = allowed or not a gated write. Exit 0 with a deny payload = blocked.
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

LOG = Path.home() / ".local" / "state" / "script-logs" / "three-laws-gate.log"
LOG_LINES_MAX = 2000
TRANSCRIPT_BYTES_MAX = 64 * 1024 * 1024

SOURCE = re.compile(r"(?:^|/)src/.*\.tsx?$")
TEST = re.compile(r"\.(?:test|spec)\.tsx?$|\.integration\.ts$")
WRITE_TOOLS = ("Write", "Edit", "NotebookEdit")

FAILED_RUN = re.compile(r"Tests\s+\d+ failed|\d+ failed \(\d+\)|FAIL\s+src/")
WROTE_SOURCE = re.compile(r'"file_path"\s*:\s*"([^"]+)"')

REASON = """Blocked: no test failed since the last write to src/.

Write the failing test first, run it, and let it fail for the reason that the
new code will fix. Then write the code.

Only sufficient test code to fail, then only sufficient production code to pass.
See .claude/skills/testing/SKILL.md"""


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


def is_gated(file_path: str) -> bool:
    if not file_path:
        return False

    if TEST.search(file_path):
        return False

    return SOURCE.search(file_path) is not None


def scan(path: Path) -> tuple[int, int]:
    """Line number of the last gated write, and of the last failing test run."""
    wrote_at = 0
    failed_at = 0
    read = 0

    with path.open(errors="replace") as transcript:
        for number, line in enumerate(transcript, start=1):
            read += len(line)

            if read > TRANSCRIPT_BYTES_MAX:
                log(f"{datetime.now().isoformat(timespec='seconds')} WARN transcript over budget")

                return 0, 1

            if FAILED_RUN.search(line):
                failed_at = number

            written = WROTE_SOURCE.search(line)

            if written is not None and is_gated(written.group(1)):
                wrote_at = number

    assert wrote_at >= 0
    assert failed_at >= 0

    return wrote_at, failed_at


def a_test_failed_since_the_last_write(transcript_path: str) -> bool:
    path = Path(transcript_path).expanduser()

    if not path.is_file():
        return True  # no transcript, no proof either way

    try:
        wrote_at, failed_at = scan(path)
    except OSError as error:
        log(f"{datetime.now().isoformat(timespec='seconds')} ERROR transcript: {error}")

        return True  # an unreadable transcript must not block every write

    assert isinstance(wrote_at, int)
    assert isinstance(failed_at, int)

    return failed_at > wrote_at


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

    if not is_gated(written):
        return 0

    stamp = datetime.now().isoformat(timespec="seconds")

    if a_test_failed_since_the_last_write(payload.get("transcript_path", "")):
        log(f"{stamp} PASS {written}")

        return 0

    log(f"{stamp} BLOCK {written}")
    deny()

    return 0


if __name__ == "__main__":
    sys.exit(main())
