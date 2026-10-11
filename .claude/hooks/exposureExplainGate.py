#!/usr/bin/env python3
"""PreToolUse hook: guard the files of the exposure pipeline.

Rule RED-01 in docs/agents/exposure.md. A write to exposure/policy.yaml,
exposure/routes.yaml, or exposure/deviations.yaml is allowed only after the
transcript shows a `pnpm explain <ID>` call for a rule of that file. When the
transcript holds a no-go line of the exposure pipeline, the call must come
after the last one and name a rule of that no-go output.

Rule RED-02. A write to exposure/adapters/ is refused, through a write tool or
through a Bash command. `pnpm exposure write` is the one writer of the adapters.

The gate fails closed. A missing transcript, an unreadable transcript, a
transcript over the byte limit, and a payload that is not JSON each deny.

Exit 0 = allowed or not a gated write. Exit 0 with a deny payload = blocked.
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

LOG = Path.home() / ".local" / "state" / "script-logs" / "exposure-explain-gate.log"
LOG_LINES_MAX = 2000
TRANSCRIPT_BYTES_MAX = 64 * 1024 * 1024

POLICY_FILES = re.compile(r"(?:^|/)exposure/(?:policy|routes|deviations)\.yaml$")
ADAPTER_FILES = re.compile(r"(?:^|/)exposure/adapters/")
ADAPTER_COMMANDS = re.compile(r"\bexposure/adapters/")
# The commands that only read. Each segment of a command that names the adapters
# starts with one of these, and no segment redirects or edits in place.
READ_ONLY = ("cat", "diff", "grep", "head", "less", "ls", "sed", "stat", "tail", "wc")
SEGMENT_SPLIT = re.compile(r"\|\||&&|;|\|")
IN_PLACE = re.compile(r"\bsed\b.*\s-i\b")
WRITE_TOOLS = ("Write", "Edit", "NotebookEdit")
TOOL_USE = "tool_use"
TOOL_USE_MARK = '"tool_use"'
TOOL_RESULT = "tool_result"
TOOL_RESULT_MARK = '"tool_result"'
# The prefixes of the rules of docs/agents/exposure.md.
RULE_ID = r"(?:ESOT|HDR|ROUTE|DATA|OUT|PROBE|EDEV|RED)-\d{2}"
EXPLAINED = re.compile(r"(?:^|&&|;)\s*pnpm explain (" + RULE_ID + r")\s*(?:$|&&|;|\|)", re.MULTILINE)
NO_GO = re.compile(r"(?:^|\n|\\n)no-go ")
CITED = re.compile(r"Rule (" + RULE_ID + r")\.")

REASON_EXPLAIN = """Blocked: no `pnpm explain <ID>` for the rule of the last exposure no-go line ran in this session.

Run `pnpm explain <ID>` with the identifier of the no-go line, as its own command. Read the rule.
Then retry this write if the rule still asks for it.
Rule RED-01 in docs/agents/exposure.md."""

REASON_ADAPTER = """Blocked: exposure/adapters/ holds generated files.

Change exposure/policy.yaml, then run `pnpm exposure write`.
Rule RED-02 in docs/agents/exposure.md."""

REASON_CLOSED = """Blocked: the gate cannot read the transcript, so it cannot see a `pnpm explain` call.

A gate that cannot run passed nothing. Rule RED-01 in docs/agents/exposure.md."""


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


def content_blocks(line: str) -> list:
    """The message content blocks of one transcript line, or [] for any other shape."""
    assert isinstance(line, str)
    assert line != ""

    try:
        entry = json.loads(line)
    except json.JSONDecodeError:
        return []  # a truncated line proves nothing

    if not isinstance(entry, dict):
        return []

    message = entry.get("message")

    if not isinstance(message, dict):
        return []

    content = message.get("content")

    if not isinstance(content, list):
        return []

    return content


def command_of(block: object) -> str:
    """The command of one Bash tool call, or "" for the rest."""
    assert isinstance(TOOL_USE, str)
    assert TOOL_USE_MARK == '"tool_use"'

    if not isinstance(block, dict):
        return ""

    if block.get("type") != TOOL_USE or block.get("name") != "Bash":
        return ""

    arguments = block.get("input")

    if not isinstance(arguments, dict):
        return ""

    return str(arguments.get("command", ""))


def result_text(block: object) -> str:
    """The output text of one tool_result block, or "" for the rest."""
    assert isinstance(TOOL_RESULT, str)
    assert TOOL_RESULT_MARK == '"tool_result"'

    if not isinstance(block, dict) or block.get("type") != TOOL_RESULT:
        return ""

    output = block.get("content")

    if isinstance(output, str):
        return output

    if not isinstance(output, list):
        return ""

    return "\n".join(str(part.get("text", "")) for part in output if isinstance(part, dict))


def explained_ids_on(line: str) -> list[str]:
    """The rule ids of the pnpm explain commands on this line."""
    assert isinstance(line, str)
    assert isinstance(EXPLAINED, re.Pattern)

    if TOOL_USE_MARK not in line:
        return []

    found = []
    for block in content_blocks(line):
        found.extend(EXPLAINED.findall(command_of(block)))
    return found


def no_go_ids_on(line: str) -> set[str] | None:
    """The exposure rule ids of a no-go output on this line, or None when the line holds none."""
    assert isinstance(line, str)
    assert isinstance(NO_GO, re.Pattern)

    if TOOL_RESULT_MARK not in line:
        return None

    for block in content_blocks(line):
        text = result_text(block)
        if NO_GO.search(text):
            ids = set(CITED.findall(text))
            if ids:
                return ids
    return None


def scan(path: Path) -> bool:
    """True when the transcript proves the explain call that Rule RED-01 asks for."""
    assert isinstance(path, Path)
    assert TRANSCRIPT_BYTES_MAX > 0

    wanted: set[str] | None = None
    explained_since_no_go: set[str] = set()
    read = 0

    with path.open(errors="replace") as transcript:
        for line in transcript:
            read += len(line)

            if read > TRANSCRIPT_BYTES_MAX:
                log(f"{datetime.now().isoformat(timespec='seconds')} DENY transcript over budget")

                return False

            ids = no_go_ids_on(line)

            if ids is not None:
                wanted = ids
                explained_since_no_go = set()

            explained_since_no_go.update(explained_ids_on(line))

    if wanted is None:
        return len(explained_since_no_go) > 0

    return len(wanted & explained_since_no_go) > 0


def explained(transcript_path: str) -> bool:
    path = Path(transcript_path).expanduser()

    if not path.is_file():
        return False

    try:
        return scan(path)
    except OSError as error:
        log(f"{datetime.now().isoformat(timespec='seconds')} DENY transcript: {error}")

        return False


def deny(reason: str) -> None:
    assert isinstance(reason, str)
    assert len(reason) > 0

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


def reads_only(command: str) -> bool:
    """True when each segment of the command starts with a read command and nothing writes."""
    assert isinstance(command, str)
    assert len(READ_ONLY) > 0

    if ">" in command or IN_PLACE.search(command):
        return False

    segments = [segment.strip() for segment in SEGMENT_SPLIT.split(command)]
    segments = [segment for segment in segments if segment]

    if not segments:
        return False

    return all(segment.split()[0] in READ_ONLY for segment in segments)


def verdict(tool_name: str, tool_input: dict, transcript_path: str) -> str:
    """The deny reason for this call, or "" when the call is allowed."""
    assert isinstance(tool_name, str)
    assert isinstance(tool_input, dict)

    if tool_name == "Bash":
        command = str(tool_input.get("command", ""))
        if ADAPTER_COMMANDS.search(command) and not reads_only(command):
            return REASON_ADAPTER
        return ""

    if tool_name not in WRITE_TOOLS:
        return ""

    file_path = str(tool_input.get("file_path", ""))

    if ADAPTER_FILES.search(file_path):
        return REASON_ADAPTER

    if not POLICY_FILES.search(file_path):
        return ""

    if not Path(transcript_path).expanduser().is_file():
        return REASON_CLOSED

    return "" if explained(transcript_path) else REASON_EXPLAIN


def decide(payload: object) -> str:
    """The deny reason for one hook payload, or "" when the call is allowed."""
    assert payload is not None
    assert isinstance(REASON_CLOSED, str)

    if not isinstance(payload, dict):
        return REASON_CLOSED

    tool_input = payload.get("tool_input", {})

    return verdict(
        str(payload.get("tool_name", "")),
        tool_input if isinstance(tool_input, dict) else {},
        str(payload.get("transcript_path", "")),
    )


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as error:
        log(f"{datetime.now().isoformat(timespec='seconds')} DENY payload: {error}")
        deny(REASON_CLOSED)

        return 0

    reason = decide(payload)

    if reason == "":
        return 0

    log(f"{datetime.now().isoformat(timespec='seconds')} DENY {str(payload)[:300]}")
    deny(reason)

    return 0


if __name__ == "__main__":
    sys.exit(main())
