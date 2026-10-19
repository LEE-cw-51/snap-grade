"""Boundary cases beyond mvp-spec §12 checklist."""

from grader.compare import compare, compute_answer_latex


def test_fullwidth_digits_and_ops():
    r = compare("６／８", "3/4")
    assert r["verdict"] == "TRI"
    assert r["reason_code"] == "NOT_REDUCED"


def test_fullwidth_equals_term_order():
    # NFKC folds fullwidth letters/digits; term order still ○
    r = compare("５ｘ＋ｘ＾２＋６", "x^2 + 5x + 6")
    assert r["verdict"] == "O"


def test_mixed_latex_vs_improper():
    r = compare(r"\frac{7}{4}", r"1\frac{3}{4}")
    assert r["verdict"] == "TRI"
    assert r["reason_code"] == "MIXED_IMPROPER"


def test_fraction_decimal():
    r = compare("0.5", r"\frac{1}{2}")
    assert r["verdict"] == "TRI"
    assert r["reason_code"] == "FRACTION_DECIMAL"


def test_not_factored():
    r = compare("x^2+5x+6", "(x+2)(x+3)", {"NOT_FACTORED": "TRIANGLE"})
    assert r["verdict"] == "TRI"
    assert r["reason_code"] == "NOT_FACTORED"


def test_plain_wrong_value():
    r = compare("5", "6")
    assert r["verdict"] == "X"
    assert r["reason_code"] is None


def test_unit_match_case_insensitive():
    r = compare("12CM", "12cm")
    assert r["verdict"] == "O"


def test_unit_wrong_value():
    r = compare("11", "12cm")
    assert r["verdict"] == "X"


def test_remainder_korean():
    r = compare("3 나머지 2", "3 ... 2")
    assert r["verdict"] == "O"


def test_solution_set_comma_only():
    r = compare("x=-3, x=2", "x = 2 또는 x = -3")
    assert r["verdict"] == "O"


def test_radical_unicode():
    r = compare("√12", r"2\sqrt{3}")
    assert r["verdict"] == "TRI"
    assert r["reason_code"] == "RADICAL_NOT_SIMPLIFIED"


def test_identical_reduced_fraction_ok():
    r = compare("3/4", "3/4")
    assert r["verdict"] == "O"


def test_compute_answer_latex_simple():
    out = compute_answer_latex(r"1+2")
    assert out is not None
    assert "3" in out.replace(" ", "")
