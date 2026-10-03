#!/usr/bin/env python3
"""Tests of mergeGate. Run: python3 .claude/hooks/mergeGate_test.py"""

import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent))
import mergeGate  # noqa: E402
from mergeGate import merge_target  # noqa: E402

TARGETS = [
    ("number first", "gh pr merge 12", "12"),
    ("one flag", "gh pr merge --squash 12", "12"),
    ("two flags", "gh pr merge --squash --delete-branch 12", "12"),
    ("short flag", "gh pr merge -s 12", "12"),
    ("flag value", "gh pr merge --subject 'a title' 12", "12"),
    ("short flag value", "gh pr merge -t title 12", "12"),
    ("flag value with equals", "gh pr merge --body=text 12", "12"),
    ("number before flags", "gh pr merge 12 --squash", "12"),
    ("url", "gh pr merge --squash https://github.com/o/r/pull/12", "https://github.com/o/r/pull/12"),
    ("chained command", "gh pr merge --squash 12 && git pull", "12"),
    ("redirect after number", "gh pr merge --squash 12 2>&1", "12"),
    ("spaced redirect after number", "gh pr merge 12 >log", "12"),
]

NO_TARGET = [
    ("no argument", "gh pr merge"),
    ("flags only", "gh pr merge --squash --delete-branch"),
    ("flags then chained command", "gh pr merge --squash && git pull"),
    ("flags then pipe", "gh pr merge --squash | tee log"),
    ("flags then redirect", "gh pr merge --squash 2>&1"),
]


class MergeTargetTest(unittest.TestCase):
    def test_target_after_flags(self) -> None:
        assert len(TARGETS) == 12

        for name, command, target in TARGETS:
            with self.subTest(name):
                self.assertEqual(merge_target(command), target)

    def test_no_target(self) -> None:
        assert len(NO_TARGET) == 5

        for name, command in NO_TARGET:
            with self.subTest(name):
                self.assertIsNone(merge_target(command))


class CheckTimeoutTest(unittest.TestCase):
    def test_timeout_denies_merge(self) -> None:
        payload = json.dumps({"tool_input": {"command": "gh pr merge 12"}})
        stdout = io.StringIO()

        with (
            patch.object(mergeGate, "CHECKS_TIMEOUT_SECONDS", 0.001),
            patch.object(sys, "stdin", io.StringIO(payload)),
            patch.object(sys, "stdout", stdout),
        ):
            exit_code = mergeGate.main()

        output = json.loads(stdout.getvalue())["hookSpecificOutput"]
        self.assertEqual(exit_code, 0)
        self.assertEqual(output["permissionDecision"], "deny")
        self.assertIn("timed out after 0.001 seconds", output["permissionDecisionReason"])


if __name__ == "__main__":
    unittest.main()
