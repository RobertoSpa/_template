#!/usr/bin/env python3
"""PreToolUse hook: refuse `gh pr merge` while a check on the head failed or runs.

Rule REPO-02 in docs/agents/security.md. A private repository on a free plan
has no ruleset, so this hook is the required status check.
"""

import json
import re
import shlex
import subprocess
import sys
from pathlib import Path

LOG = Path.home() / ".local" / "state" / "script-logs" / "merge-gate.log"
LOG_LINES_MAX = 2000
CHECKS_TIMEOUT_SECONDS = 60
MERGE = re.compile(r"\bgh\s+pr\s+merge\b")
MERGE_VALUE_FLAGS = frozenset(
    {"-A", "--author-email", "-b", "--body", "-F", "--body-file", "--match-head-commit", "-t", "--subject", "-R", "--repo"}
)
SHELL_OPERATOR_CHARACTERS = frozenset("();<>|&")
FILE_DESCRIPTOR_REDIRECT = re.compile(r"(?<=\s)\d+(?=[<>])")
PASSED_BUCKETS = ("pass", "skipping")


def merge_target(command: str) -> str | None:
    assert isinstance(command, str)
    match = MERGE.search(command)
    assert match is not None
    rest = FILE_DESCRIPTOR_REDIRECT.sub("", command[match.end() :])
    lexer = shlex.shlex(rest, posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
    try:
        tokens = list(lexer)
    except ValueError as error:
        log(f"ERROR shlex failed, split on spaces: {error}")
        tokens = rest.split()
    value_expected = False
    for token in tokens:
        if token and set(token) <= SHELL_OPERATOR_CHARACTERS:
            return None
        if value_expected:
            value_expected = False
        elif token.startswith("-"):
            value_expected = token in MERGE_VALUE_FLAGS
        elif token:
            return token
    return None


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
    if MERGE.search(command) is None:
        return 0
    unfinished = unfinished_checks(merge_target(command))
    if unfinished:
        deny("REPO-02: a check on the pull request head is not green. " + "; ".join(unfinished))
        return 0
    log(f"OK {command.strip()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
