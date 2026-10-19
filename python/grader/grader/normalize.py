"""Input normalization before parsing."""

from __future__ import annotations

import re
import unicodedata


_FULLWIDTH = str.maketrans(
    {
        "／": "/",
        "＋": "+",
        "－": "-",
        "−": "-",
        "＝": "=",
        "（": "(",
        "）": ")",
        "．": ".",
        "，": ",",
        "×": "*",
        "÷": "/",
        "·": "*",
        "⋅": "*",
        "√": "sqrt",
    }
)


def normalize(raw: str) -> str:
    if raw is None:
        return ""
    s = unicodedata.normalize("NFKC", str(raw)).strip()
    s = s.translate(_FULLWIDTH)
    s = s.replace("×", "*").replace("÷", "/")
    s = s.replace("√", "sqrt")
    # LaTeX wrappers commonly seen from vision
    s = s.replace("\\left", "").replace("\\right", "")
    s = re.sub(r"\\mathrm\{([^}]*)\}", r"\1", s)
    s = re.sub(r"\\text\{([^}]*)\}", r"\1", s)
    s = s.replace("\\frac", "FRAC")
    s = s.replace("\\dfrac", "FRAC")
    s = s.replace("\\sqrt", "SQRT")
    s = s.replace("\\pm", "+-")
    s = s.replace("\\times", "*")
    s = s.replace("\\div", "/")
    s = s.replace("\\cdot", "*")
    s = s.replace("\\,", "").replace("\\;", "").replace("\\!", "")
    s = s.replace("\\{", "{").replace("\\}", "}")
    s = s.replace("$", "")
    # mixed number: 1 3/4 or 1\frac{3}{4}
    s = re.sub(r"(\d+)\s+FRAC\s*\{", r"\1+FRAC{", s)
    s = re.sub(r"(\d+)\s+(\d+)\s*/\s*(\d+)", r"(\1+\2/\3)", s)
    # restore FRAC/SQRT to latex-like for parser
    s = _restore_frac(s)
    s = _restore_sqrt(s)
    # remainder: 3 ... 2 / 3…2 / 3 나머지 2
    s = re.sub(r"(\d+)\s*(?:\.\.\.|…|⋯)\s*(\d+)", r"REM(\1,\2)", s)
    s = re.sub(r"(\d+)\s*나머지\s*(\d+)", r"REM(\1,\2)", s)
    s = re.sub(r"몫\s*(\d+)\s*나머지\s*(\d+)", r"REM(\1,\2)", s)
    # equation solutions: 또는 / or / ,
    s = re.sub(r"\s*또는\s*", " OR ", s)
    s = re.sub(r"\s+or\s+", " OR ", s, flags=re.I)
    # x = forms
    s = re.sub(r"([a-zA-Z])\s*=\s*", r"\1=", s)
    # spaces around operators (keep REM/OR intact)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _restore_frac(s: str) -> str:
    # FRAC{a}{b} -> ((a)/(b))
    while "FRAC" in s:
        m = re.search(r"FRAC\s*\{([^{}]*)\}\s*\{([^{}]*)\}", s)
        if not m:
            break
        s = s[: m.start()] + f"(({m.group(1)})/({m.group(2)}))" + s[m.end() :]
    return s


def _restore_sqrt(s: str) -> str:
    # SQRT{a} -> sqrt(a) ; SQRT[n]{a} -> (a)**(1/n)
    while "SQRT" in s:
        m = re.search(r"SQRT\s*\[([^\]]+)\]\s*\{([^{}]*)\}", s)
        if m:
            s = s[: m.start()] + f"(({m.group(2)})**(1/({m.group(1)})))" + s[m.end() :]
            continue
        m = re.search(r"SQRT\s*\{([^{}]*)\}", s)
        if m:
            s = s[: m.start()] + f"sqrt({m.group(1)})" + s[m.end() :]
            continue
        # bare SQRT2 style rare; stop
        break
    return s
