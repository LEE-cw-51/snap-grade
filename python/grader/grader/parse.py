"""Parse normalized strings into typed answer values."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Optional

import sympy as sp
from sympy.parsing.sympy_parser import (
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

from .normalize import normalize


TRANSFORMATIONS = standard_transformations + (implicit_multiplication_application,)


@dataclass
class ParsedAnswer:
    kind: str  # expression | remainder | unit | solution_set | compare
    expr: Any = None
    quotient: Optional[int] = None
    remainder: Optional[int] = None
    value: Any = None
    unit: Optional[str] = None
    solutions: Optional[list] = None
    raw_normalized: str = ""
    # form hints from original latex-ish input
    is_fraction_like: bool = False
    is_mixed: bool = False
    is_decimal: bool = False
    is_product_form: bool = False  # (a)(b) style
    has_radical: bool = False
    denominator_has_radical: bool = False
    original: str = ""


_UNIT_RE = re.compile(
    r"^(?P<num>.+?)(?P<unit>cm|mm|m|km|L|mL|ml|g|kg|원|개|명)$",
    re.I,
)


def parse(raw: str) -> ParsedAnswer:
    original = raw if raw is not None else ""
    s = normalize(original)
    hints = _form_hints(original, s)

    if not s:
        return ParsedAnswer(kind="expression", raw_normalized=s, original=original, **hints)

    # remainder
    m = re.fullmatch(r"REM\((\d+),(\d+)\)", s.replace(" ", ""))
    if m:
        return ParsedAnswer(
            kind="remainder",
            quotient=int(m.group(1)),
            remainder=int(m.group(2)),
            raw_normalized=s,
            original=original,
            **hints,
        )

    # solution set: x=2 OR x=-3  /  x=-3, x=2
    if " OR " in s or re.search(r"[a-zA-Z]=.+,", s):
        parts = re.split(r"\s+OR\s+|,\s*", s)
        sols = []
        for p in parts:
            p = p.strip()
            if not p:
                continue
            mm = re.fullmatch(r"([a-zA-Z])=(.+)", p.replace(" ", ""))
            if mm:
                sols.append(_parse_expr(mm.group(2)))
            else:
                sols.append(_parse_expr(p))
        return ParsedAnswer(
            kind="solution_set",
            solutions=sols,
            raw_normalized=s,
            original=original,
            **hints,
        )

    # single x=3
    mm = re.fullmatch(r"([a-zA-Z])=(.+)", s.replace(" ", ""))
    if mm and "OR" not in s:
        return ParsedAnswer(
            kind="solution_set",
            solutions=[_parse_expr(mm.group(2))],
            raw_normalized=s,
            original=original,
            **hints,
        )

    # comparison operators alone
    if s in {">", "<", "=", "≥", "≤", "!=", "≠"}:
        return ParsedAnswer(kind="compare", value=s, raw_normalized=s, original=original, **hints)

    # unit
    um = _UNIT_RE.match(s.replace(" ", ""))
    if um:
        num = _parse_expr(um.group("num"))
        return ParsedAnswer(
            kind="unit",
            value=num,
            unit=um.group("unit"),
            expr=num,
            raw_normalized=s,
            original=original,
            **hints,
        )

    expr = _parse_expr(s)
    return ParsedAnswer(
        kind="expression",
        expr=expr,
        value=expr,
        raw_normalized=s,
        original=original,
        **hints,
    )


def _parse_expr(s: str) -> Any:
    s = s.strip()
    s = s.replace("^", "**")
    # 2sqrt(3) -> 2*sqrt(3)
    s = re.sub(r"(\d)\s*(sqrt\()", r"\1*\2", s)
    s = re.sub(r"(\))(\()", r"\1*\2", s)
    s = re.sub(r"(\d)([a-zA-Z])", r"\1*\2", s)
    try:
        return parse_expr(s, transformations=TRANSFORMATIONS, evaluate=True)
    except Exception:
        return sp.Symbol("__unparsed__")


def _form_hints(original: str, normalized: str) -> dict:
    o = original or ""
    n = normalized or ""
    is_mixed = bool(
        re.search(r"\d+\s+\d+\s*/\s*\d+", o)
        or re.search(r"\d+\s*\\frac", o)
        or re.search(r"\d+\+", n)
        and "/" in n
    )
    # mixed detection: normalize turns 1 3/4 into (1+3/4)
    if re.search(r"\(\d+\+\d+/\d+\)", n.replace(" ", "")):
        is_mixed = True
    is_fraction_like = ("/" in n or "frac" in o.lower()) and not is_mixed
    if not is_mixed and (
        re.search(r"\(\(.+\)/\(.+\)\)", n) or re.search(r"\d+/\d+", n)
    ):
        is_fraction_like = True
    is_decimal = bool(re.search(r"\d+\.\d+", o)) and "/" not in n
    # product of binomials: (x+2)(x+3) without outer expand
    is_product_form = bool(
        re.search(r"\)\s*\(", n) or re.search(r"\)\(", o.replace(" ", ""))
    )
    has_radical = "sqrt" in n or "sqrt" in o.lower() or "√" in o
    denom_rad = bool(
        re.search(r"/\s*sqrt\(", n)
        or re.search(r"1/sqrt", n.replace(" ", ""))
        or re.search(r"\\frac\{[^}]*\}\{\\sqrt", o)
        or re.search(r"/\s*√", o)
    )
    return dict(
        is_fraction_like=is_fraction_like,
        is_mixed=is_mixed,
        is_decimal=is_decimal,
        is_product_form=is_product_form,
        has_radical=has_radical,
        denominator_has_radical=denom_rad,
    )
