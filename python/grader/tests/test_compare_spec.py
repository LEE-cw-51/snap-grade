"""Spec chapter 12 required compare cases."""

from grader.compare import compare


def test_term_order_ok():
    r = compare("5x + x^2 + 6", "x^2 + 5x + 6")
    assert r["verdict"] == "O"


def test_not_reduced():
    r = compare("6/8", "3/4")
    assert r["verdict"] == "TRI"
    assert r["reason_code"] == "NOT_REDUCED"


def test_not_reduced_latex():
    r = compare(r"\frac{6}{8}", r"\frac{3}{4}")
    assert r["verdict"] == "TRI"
    assert r["reason_code"] == "NOT_REDUCED"


def test_radical_not_simplified():
    r = compare(r"\sqrt{12}", r"2\sqrt{3}")
    assert r["verdict"] == "TRI"
    assert r["reason_code"] == "RADICAL_NOT_SIMPLIFIED"


def test_not_rationalized():
    r = compare(r"1/\sqrt{2}", r"\sqrt{2}/2")
    assert r["verdict"] == "TRI"
    assert r["reason_code"] == "NOT_RATIONALIZED"


def test_not_expanded():
    r = compare("(x+2)(x+3)", "x^2+5x+6", {"NOT_EXPANDED": "TRIANGLE"})
    assert r["verdict"] == "TRI"
    assert r["reason_code"] == "NOT_EXPANDED"


def test_mixed_improper():
    r = compare("7/4", "1 3/4")
    assert r["verdict"] == "TRI"
    assert r["reason_code"] == "MIXED_IMPROPER"


def test_remainder_ok():
    r = compare("3 ... 2", "3 ... 2")
    assert r["verdict"] == "O"


def test_remainder_wrong():
    r = compare("3 ... 1", "3 ... 2")
    assert r["verdict"] == "X"


def test_solution_set_order():
    r = compare("x = 2 또는 x = -3", "x = -3, x = 2")
    assert r["verdict"] == "O"


def test_unit_missing():
    r = compare("12", "12cm")
    assert r["verdict"] == "TRI"
    assert r["reason_code"] == "UNIT_MISSING"


def test_form_rule_escalate_to_wrong():
    r = compare("6/8", "3/4", {"NOT_REDUCED": "WRONG"})
    assert r["verdict"] == "X"
    assert r["reason_code"] == "NOT_REDUCED"
