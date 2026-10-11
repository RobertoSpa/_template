#!/usr/bin/env python3
"""Tests of exposureExplainGate.verdict. Run: python3 .claude/hooks/exposureExplainGate_test.py"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from exposureExplainGate import REASON_ADAPTER, REASON_CLOSED, REASON_EXPLAIN, decide, verdict  # noqa: E402


def bash(command: str) -> str:
    return json.dumps({"message": {"content": [{"type": "tool_use", "name": "Bash", "input": {"command": command}}]}})


def result(text: str) -> str:
    return json.dumps({"message": {"content": [{"type": "tool_result", "content": text}]}})


def transcript(lines: list[str]) -> str:
    handle = tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False)
    handle.write("\n".join(lines) + "\n")
    handle.close()
    return handle.name


POLICY = {"file_path": "exposure/policy.yaml"}
NO_GO = result("no-go policy\n       headers.fixed.x-frame-options is not DENY. Do: Set it. Rule HDR-05.\n")


class VerdictTest(unittest.TestCase):
    def test_a_source_file_is_not_gated(self) -> None:
        self.assertEqual(verdict("Edit", {"file_path": "src/app/main.tsx"}, transcript([])), "")

    def test_an_adapter_write_is_refused(self) -> None:
        self.assertEqual(
            verdict("Edit", {"file_path": "/repo/exposure/adapters/_headers"}, transcript([bash("pnpm explain RED-02")])),
            REASON_ADAPTER,
        )

    def test_a_bash_write_to_an_adapter_is_refused(self) -> None:
        self.assertEqual(
            verdict("Bash", {"command": "cat > exposure/adapters/_headers <<'EOF'\nx\nEOF"}, "/none"),
            REASON_ADAPTER,
        )

    def test_a_bash_read_of_an_adapter_is_allowed(self) -> None:
        self.assertEqual(verdict("Bash", {"command": "cat exposure/adapters/_headers"}, "/none"), "")
        self.assertEqual(verdict("Bash", {"command": "grep -n x exposure/adapters/_headers | head -3"}, "/none"), "")
        self.assertEqual(verdict("Bash", {"command": "sed -n 1,3p exposure/adapters/nginx.conf && diff exposure/adapters/_headers /tmp/x"}, "/none"), "")

    def test_a_bash_command_that_is_not_a_read_is_refused(self) -> None:
        for command in (
            "sed -i 's/a/b/' exposure/adapters/_headers",
            "python3 fix.py exposure/adapters/_headers",
            "cat x >> exposure/adapters/_headers",
            "cp x exposure/adapters/_headers",
            "cat exposure/adapters/_headers | tee out",
            "ls exposure/adapters/ && node write.js",
        ):
            self.assertEqual(verdict("Bash", {"command": command}, "/none"), REASON_ADAPTER, command)

    def test_a_payload_that_is_not_an_object_denies(self) -> None:
        self.assertEqual(decide(["Edit"]), REASON_CLOSED)
        self.assertEqual(decide("x"), REASON_CLOSED)

    def test_a_payload_object_goes_to_the_verdict(self) -> None:
        self.assertEqual(decide({"tool_name": "Edit", "tool_input": {"file_path": "src/a.ts"}}), "")

    def test_the_policy_file_is_refused_with_no_explain(self) -> None:
        self.assertEqual(verdict("Edit", POLICY, transcript([bash("pnpm exposure policy")])), REASON_EXPLAIN)

    def test_the_policy_file_is_allowed_after_an_explain_with_no_no_go(self) -> None:
        self.assertEqual(verdict("Edit", POLICY, transcript([bash("pnpm explain HDR-03")])), "")

    def test_the_explain_must_name_a_rule_of_the_last_no_go(self) -> None:
        self.assertEqual(
            verdict("Edit", POLICY, transcript([bash("pnpm explain HDR-03"), NO_GO])),
            REASON_EXPLAIN,
        )
        self.assertEqual(
            verdict("Edit", POLICY, transcript([NO_GO, bash("pnpm explain HDR-03")])),
            REASON_EXPLAIN,
        )
        self.assertEqual(verdict("Edit", POLICY, transcript([NO_GO, bash("pnpm explain HDR-05")])), "")

    def test_an_explain_inside_a_heredoc_does_not_count(self) -> None:
        command = "cat > x.md <<'EOF'\nrun pnpm explain HDR-05 first\nEOF"
        self.assertEqual(verdict("Edit", POLICY, transcript([NO_GO, bash(command)])), REASON_EXPLAIN)

    def test_an_explain_after_a_cd_counts(self) -> None:
        self.assertEqual(verdict("Edit", POLICY, transcript([bash("cd /repo && pnpm explain OUT-01")])), "")

    def test_an_explain_of_another_pipeline_does_not_count(self) -> None:
        self.assertEqual(
            verdict("Edit", {"file_path": "exposure/routes.yaml"}, transcript([bash("pnpm explain LAB-01")])),
            REASON_EXPLAIN,
        )

    def test_a_missing_transcript_denies(self) -> None:
        self.assertEqual(verdict("Edit", POLICY, "/nonexistent/t.jsonl"), REASON_CLOSED)


if __name__ == "__main__":
    unittest.main()
