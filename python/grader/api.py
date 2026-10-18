"""Minimal HTTP API for Next.js to call compare."""

from __future__ import annotations

from flask import Flask, jsonify, request

from grader.compare import compare, compute_answer_latex

app = Flask(__name__)


@app.post("/compare")
def compare_route():
    body = request.get_json(force=True, silent=True) or {}
    student = body.get("student", "")
    answer = body.get("answer", "")
    form_rules = body.get("form_rules")
    result = compare(student, answer, form_rules)
    return jsonify(result)


@app.post("/compute")
def compute_route():
    body = request.get_json(force=True, silent=True) or {}
    problem = body.get("problem_latex", "")
    return jsonify({"computed_answer_latex": compute_answer_latex(problem)})


@app.get("/health")
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001)
