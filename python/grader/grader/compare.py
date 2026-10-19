"""Compare student answer to answer-key answer with form rules."""

from __future__ import annotations

from typing import Any, Optional

import sympy as sp

from .parse import ParsedAnswer, parse

DEFAULT_FORM_RULES = {
    "NOT_REDUCED": "TRIANGLE",
    "MIXED_IMPROPER": "TRIANGLE",
    "FRACTION_DECIMAL": "TRIANGLE",
    "RADICAL_NOT_SIMPLIFIED": "TRIANGLE",
    "NOT_RATIONALIZED": "TRIANGLE",
    "NOT_EXPANDED": "TRIANGLE",
    "NOT_FACTORED": "TRIANGLE",
    "UNIT_MISSING": "TRIANGLE",
    "OTHER_FORM": "TRIANGLE",
}


def compare(
    student: str,
    answer: str,
    form_rules: Optional[dict[str, str]] = None,
) -> dict[str, Any]:
    rules = {**DEFAULT_FORM_RULES, **(form_rules or {})}
    s = parse(student)
    a = parse(answer)

    if s.kind == "remainder" or a.kind == "remainder":
        return _compare_remainder(s, a)

    if s.kind == "solution_set" or a.kind == "solution_set":
        return _compare_solutions(s, a)

    if a.kind == "unit" or s.kind == "unit":
        return _compare_unit(s, a, rules)

    if s.kind == "compare" or a.kind == "compare":
        if s.value == a.value:
            return _ok()
        return _wrong()

    return _compare_expression(s, a, rules)


def _ok() -> dict[str, Any]:
    return {"verdict": "O", "reason_code": None}


def _wrong() -> dict[str, Any]:
    return {"verdict": "X", "reason_code": None}


def _tri(code: str, rules: dict[str, str]) -> dict[str, Any]:
    mode = rules.get(code, "TRIANGLE")
    if mode == "WRONG":
        return {"verdict": "X", "reason_code": code}
    return {"verdict": "TRI", "reason_code": code}


def _values_equal(e1: Any, e2: Any) -> bool:
    if e1 is None or e2 is None:
        return False
    if e1 == sp.Symbol("__unparsed__") or e2 == sp.Symbol("__unparsed__"):
        return False
    try:
        diff = sp.simplify(sp.expand(e1) - sp.expand(e2))
        return diff == 0
    except Exception:
        try:
            return bool(sp.Eq(sp.simplify(e1), sp.simplify(e2)))
        except Exception:
            return False


def _structurally_same(e1: Any, e2: Any) -> bool:
    """Term-order-insensitive structural equality of expanded polynomials / numbers."""
    try:
        a = sp.expand(e1)
        b = sp.expand(e2)
        if a == b:
            return True
        # sorted args for Add
        if isinstance(a, sp.Add) and isinstance(b, sp.Add):
            return sp.Add(*sorted(a.args, key=sp.default_sort_key)) == sp.Add(
                *sorted(b.args, key=sp.default_sort_key)
            )
        return sp.simplify(a - b) == 0 and _same_form_family(e1, e2)
    except Exception:
        return False


def _same_form_family(e1: Any, e2: Any) -> bool:
    """True when both are 'fully simplified' in the same way (no pending form issues)."""
    try:
        return sp.srepr(sp.expand(e1)) == sp.srepr(sp.expand(e2))
    except Exception:
        return False


def _compare_expression(
    s: ParsedAnswer, a: ParsedAnswer, rules: dict[str, str]
) -> dict[str, Any]:
    se, ae = s.expr, a.expr
    if se is None or ae is None:
        return _wrong()

    # Exact structural match after expand/sort → O
    if _structurally_same(se, ae) and not _form_reasons(s, a):
        return _ok()

    if not _values_equal(se, ae):
        return _wrong()

    reasons = _form_reasons(s, a)
    if reasons:
        return _tri(reasons[0], rules)

    # values equal, no form violation → O (e.g. term order only)
    if _values_equal(se, ae):
        return _ok()
    return _wrong()


def _form_reasons(s: ParsedAnswer, a: ParsedAnswer) -> list[str]:
    reasons: list[str] = []
    se, ae = s.expr, a.expr

    # fraction not reduced: student is fraction-like, value equals reduced answer
    if s.is_fraction_like and not s.is_mixed:
        if _is_unreduced_fraction(s):
            reasons.append("NOT_REDUCED")

    # mixed vs improper
    if (s.is_mixed and not a.is_mixed) or (a.is_mixed and not s.is_mixed and s.is_fraction_like):
        if _values_equal(se, ae):
            reasons.append("MIXED_IMPROPER")

    # decimal vs fraction
    if (s.is_decimal and (a.is_fraction_like or a.is_mixed)) or (
        a.is_decimal and (s.is_fraction_like or s.is_mixed)
    ):
        if _values_equal(se, ae):
            reasons.append("FRACTION_DECIMAL")

    # radical not simplified — inspect original text; SymPy may auto-simplify
    if (
        _radical_not_simplified_text(s.original)
        and not _radical_not_simplified_text(a.original)
        and _values_equal(se, ae)
    ):
        reasons.append("RADICAL_NOT_SIMPLIFIED")

    # not rationalized
    if s.denominator_has_radical and not a.denominator_has_radical:
        if _values_equal(se, ae):
            reasons.append("NOT_RATIONALIZED")

    # not expanded: student left as product, answer expanded
    if s.is_product_form and not a.is_product_form:
        if _values_equal(se, ae):
            reasons.append("NOT_EXPANDED")

    # not factored: student expanded, answer product
    if a.is_product_form and not s.is_product_form:
        if _values_equal(se, ae):
            reasons.append("NOT_FACTORED")

    # dedupe preserving order
    seen = set()
    out = []
    for r in reasons:
        if r not in seen:
            seen.add(r)
            out.append(r)
    return out


def _is_unreduced_fraction(p: ParsedAnswer) -> bool:
    """Detect p/q where gcd>1 from original/normalized text."""
    import re
    from math import gcd

    text = p.raw_normalized.replace(" ", "")
    m = re.search(r"\(?\(?(\d+)\)?/\(?(\d+)\)?\)?", text)
    if not m:
        # try original latex-ish
        m = re.search(r"(\\frac|FRAC)\{(\d+)\}\{(\d+)\}", p.original.replace(" ", ""))
        if m:
            num, den = int(m.group(2)), int(m.group(3))
            return gcd(num, den) > 1 and den != 0
        return False
    num, den = int(m.group(1)), int(m.group(2))
    return den != 0 and gcd(num, den) > 1


def _radical_not_simplified_text(text: str) -> bool:
    import re

    if not text:
        return False
    for m in re.finditer(r"\\sqrt\s*\{(\d+)\}", text):
        n = int(m.group(1))
        if _has_square_factor(n):
            return True
    for m in re.finditer(r"sqrt\((\d+)\)", text.replace(" ", "")):
        n = int(m.group(1))
        if _has_square_factor(n):
            return True
    for m in re.finditer(r"√\s*(\d+)", text):
        n = int(m.group(1))
        if _has_square_factor(n):
            return True
    return False


def _has_square_factor(n: int) -> bool:
    n = abs(n)
    for k in range(2, int(n**0.5) + 1):
        if n % (k * k) == 0:
            return True
    return False


def _radical_not_simplified(expr: Any) -> bool:
    try:
        # walk Pow with Rational 1/2
        for node in sp.preorder_traversal(expr):
            if isinstance(node, sp.Pow) and node.exp == sp.Rational(1, 2):
                base = node.base
                if base.is_integer:
                    n = int(base)
                    for k in range(2, int(abs(n) ** 0.5) + 1):
                        if n % (k * k) == 0:
                            return True
                if isinstance(base, sp.Integer):
                    n = int(base)
                    for k in range(2, int(abs(n) ** 0.5) + 1):
                        if n % (k * k) == 0:
                            return True
            if getattr(node, "func", None) is sp.sqrt:
                base = node.args[0]
                if base.is_integer:
                    n = int(base)
                    for k in range(2, int(abs(n) ** 0.5) + 1):
                        if n % (k * k) == 0:
                            return True
        return False
    except Exception:
        return False


def _compare_remainder(s: ParsedAnswer, a: ParsedAnswer) -> dict[str, Any]:
    if s.kind != "remainder" or a.kind != "remainder":
        return _wrong()
    if s.quotient == a.quotient and s.remainder == a.remainder:
        return _ok()
    return _wrong()


def _compare_solutions(s: ParsedAnswer, a: ParsedAnswer) -> dict[str, Any]:
    ss = s.solutions if s.kind == "solution_set" else [s.expr]
    aa = a.solutions if a.kind == "solution_set" else [a.expr]
    if ss is None or aa is None:
        return _wrong()
    if len(ss) != len(aa):
        return _wrong()
    used = [False] * len(aa)
    for x in ss:
        matched = False
        for i, y in enumerate(aa):
            if used[i]:
                continue
            if _values_equal(x, y):
                used[i] = True
                matched = True
                break
        if not matched:
            return _wrong()
    return _ok()


def _compare_unit(
    s: ParsedAnswer, a: ParsedAnswer, rules: dict[str, str]
) -> dict[str, Any]:
    # answer has unit, student missing
    if a.kind == "unit" and s.kind != "unit":
        if _values_equal(s.expr if s.expr is not None else s.value, a.value):
            return _tri("UNIT_MISSING", rules)
        return _wrong()
    if s.kind == "unit" and a.kind == "unit":
        if s.unit and a.unit and s.unit.lower() == a.unit.lower() and _values_equal(
            s.value, a.value
        ):
            return _ok()
        if _values_equal(s.value, a.value) and s.unit != a.unit:
            return _tri("OTHER_FORM", rules)
        return _wrong()
    if s.kind == "unit" and a.kind != "unit":
        if _values_equal(s.value, a.expr if a.expr is not None else a.value):
            return _ok()  # extra unit when answer has none — treat as O for MVP
        return _wrong()
    return _wrong()


def compute_answer_latex(problem_latex: str) -> Optional[str]:
    """Derive a normalized latex-ish value from a problem expression (ephemeral use)."""
    if not problem_latex:
        return None
    p = parse(problem_latex)
    if p.kind != "expression" or p.expr is None:
        return None
    try:
        val = sp.simplify(p.expr)
        return sp.latex(val)
    except Exception:
        return None
