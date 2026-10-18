#!/usr/bin/env python3
"""JSON stdin/stdout CLI for Next.js bridge."""

from __future__ import annotations

import json
import sys

from grader.compare import compare, compute_answer_latex


def main() -> None:
    payload = json.load(sys.stdin)
    op = payload.get("op", "compare")
    if op == "compute":
        out = {"computed_answer_latex": compute_answer_latex(payload.get("problem_latex", ""))}
    else:
        out = compare(
            payload.get("student", ""),
            payload.get("answer", ""),
            payload.get("form_rules"),
        )
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
