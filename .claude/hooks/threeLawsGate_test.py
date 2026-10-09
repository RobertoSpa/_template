#!/usr/bin/env python3
"""Tests of threeLawsGate.FAILED_RUN. Run: python3 .claude/hooks/threeLawsGate_test.py

Each line below is copied from a transcript. A transcript line is one JSON
object, so a newline inside a tool result is the two characters backslash n.
"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from threeLawsGate import FAILED_RUN, scan  # noqa: E402

RED = [
    ("Vitest summary", "Tests  1 failed | 4 passed (5)"),
    ("Vitest per-file", "FAIL  src/app/main.test.tsx > shows the name"),
    ("Playwright summary", "  1 failed\\n    e2e/siteName.e2e.ts:3:1 › shows the name"),
    ("Playwright summary, real newline", "  1 failed\n    e2e/siteName.e2e.ts:3:1"),
    ("tsc error", "src/app/main.tsx(7,26): error TS2877: x"),
    ("ESLint summary", "\\n✖ 1 problem (1 error, 0 warnings)\\n"),
    ("ESLint summary, plural", "\\n✖ 2 problems (2 errors, 0 warnings)\\n"),
    ("no-go line of a pipeline", "$ node scripts/bundle.ts policy\\nno-go policy\\n       note:"),
]

GREEN = [
    ("Vitest all pass", "Tests  5 passed (5)"),
    ("Playwright all pass", "  3 passed (2.1s)"),
    ("tsc clean", "$ tsc --noEmit\\n"),
    ("ESLint warnings only", "\\n✖ 2 problems (0 errors, 2 warnings)\\n"),
    ("go line of a pipeline", "$ node scripts/bundle.ts policy\\ngo     policy\\n"),
    ("prose about the no-go line", "and each no-go line names its rule."),
    ("timestamp before failed", "2026-09-07 23:37:14 failed: pnpm check"),
]


class FailedRunTest(unittest.TestCase):
    def test_red_output_matches(self) -> None:
        assert len(RED) == 8

        for name, line in RED:
            with self.subTest(name):
                self.assertIsNotNone(FAILED_RUN.search(line), line)

    def test_green_output_does_not_match(self) -> None:
        assert len(GREEN) == 7

        for name, line in GREEN:
            with self.subTest(name):
                self.assertIsNone(FAILED_RUN.search(line), line)


SCANNED = [
    ("user chat text", 0, {"type": "user", "message": {"content": "the CI log says Tests 3 failed"}}),
    (
        "assistant text block",
        0,
        {"type": "assistant", "message": {"content": [{"type": "text", "text": "FAIL  src/app/main.test.tsx"}]}},
    ),
    (
        "tool result string",
        1,
        {"type": "user", "message": {"content": [{"type": "tool_result", "content": "Tests  1 failed | 4 passed (5)"}]}},
    ),
    (
        "tool result text blocks",
        1,
        {
            "type": "user",
            "message": {
                "content": [{"type": "tool_result", "content": [{"type": "text", "text": "  1 failed\n    e2e/a.e2e.ts:3:1"}]}]
            },
        },
    ),
    (
        "tool result that passed",
        0,
        {"type": "user", "message": {"content": [{"type": "tool_result", "content": "Tests  5 passed (5)"}]}},
    ),
    ("line that is a list", 0, ["tool_result", "tool_use"]),
    ("message that is null", 0, {"type": "user", "message": None, "note": ["tool_result", "tool_use"]}),
]


class ScanTest(unittest.TestCase):
    def test_only_a_tool_result_counts_as_a_failing_run(self) -> None:
        assert len(SCANNED) == 7

        for name, failed_at, entry in SCANNED:
            with self.subTest(name), tempfile.TemporaryDirectory() as directory:
                transcript = Path(directory) / "transcript.jsonl"
                transcript.write_text(json.dumps(entry) + "\n")

                self.assertEqual(scan(transcript), (0, failed_at))


if __name__ == "__main__":
    unittest.main()
