#!/usr/bin/env python3
"""PreToolUse hook: refuse `gh pr merge` while a check on the head failed or runs.

Rule REPO-02 in docs/agents/security.md. A private repository on a free plan
has no ruleset, so this hook is the required status check.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

LOG = Path.home() / ".local" / "state" / "script-logs" / "merge-gate.log"
LOG_LINES_MAX = 2000
CHECKS_TIMEOUT_SECONDS = 60
MERGE = re.compile(r"\bgh\s+pr\s+merge\b(?:\s+(?P<target>[^\s-]\S*))?")
PASSED_BUCKETS = ("pass", "skipping")


def log(message: str) -> None:
    assert isinstance(message, str)
    assert message
    try:
        LOG.parent.mkdir(parents=True, exist_ok=True)
        with LOG.open("a") as handle:
            handle.write(message.rstrip() + "\n")
        lines = LOG.read_text().splitlines()
        if len(lines) > LOG_LINES_MAX:
            LOG.write_text("\n".join(lines[-LOG_LINES_MAX:]) + "\n")
    except OSError as error:
        print(f"merge-gate: log failed: {error}", file=sys.stderr)


def deny(reason: str) -> None:
    assert reason
    assert "\n" not in reason[:1]
    log(f"DENY {reason}")
    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        },
        sys.stdout,
    )


def unfinished_checks(target: str | None) -> list[str]:
    assert target is None or target
    command = ["gh", "pr", "checks", "--json", "name,bucket"]
    if target is not None:
        command.append(target)
    result = subprocess.run(
        command, capture_output=True, text=True, timeout=CHECKS_TIMEOUT_SECONDS, check=False
    )
    if result.returncode not in (0, 8):
        return [f"gh pr checks failed: {result.stderr.strip() or result.stdout.strip()}"]
    checks = json.loads(result.stdout or "[]")
    assert isinstance(checks, list)
    return [f"{check['name']} is {check['bucket']}" for check in checks if check["bucket"] not in PASSED_BUCKETS]


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as error:
        log(f"ERROR payload is not JSON: {error}")
        return 0
    assert isinstance(payload, dict)
    command = payload.get("tool_input", {}).get("command", "")
    assert isinstance(command, str)
    match = MERGE.search(command)
    if match is None:
        return 0
    unfinished = unfinished_checks(match.group("target"))
    if unfinished:
        deny("REPO-02: a check on the pull request head is not green. " + "; ".join(unfinished))
        return 0
    log(f"OK {command.strip()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
