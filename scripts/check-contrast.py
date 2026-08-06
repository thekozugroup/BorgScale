#!/usr/bin/env python3
"""Verify the design tokens in frontend/src/index.css meet WCAG contrast minimums.

Parses the oklch values straight out of the stylesheet rather than duplicating
them here, so this cannot drift from what actually ships. Exits non-zero when a
pair falls below its threshold, which is what makes it usable as a CI gate.

    python3 scripts/check-contrast.py
"""

from __future__ import annotations

import math
import re
import sys
from pathlib import Path

CSS_PATH = Path(__file__).resolve().parent.parent / "frontend" / "src" / "index.css"

# WCAG 2.2: 4.5:1 for body text, 3:1 for large text and for the boundaries of
# user interface components and focus indicators.
TEXT_MIN = 4.5
UI_MIN = 3.0


def oklch_to_srgb(lightness: float, chroma: float, hue: float) -> tuple[float, float, float]:
    h = math.radians(hue)
    a = chroma * math.cos(h)
    b = chroma * math.sin(h)

    l_ = lightness + 0.3963377774 * a + 0.2158037573 * b
    m_ = lightness - 0.1055613458 * a - 0.0638541728 * b
    s_ = lightness - 0.0894841775 * a - 1.2914855480 * b

    l, m, s = l_**3, m_**3, s_**3

    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

    def to_srgb(c: float) -> float:
        c = max(0.0, min(1.0, c))
        return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055

    return tuple(to_srgb(c) for c in (r, g, bb))  # type: ignore[return-value]


def composite(fg: tuple[float, float, float], alpha: float, bg: tuple[float, float, float]):
    """Flatten a translucent colour onto its backdrop.

    A -subtle token is the solid hue at low alpha; measuring it without the
    backdrop underneath reports a contrast the user never sees.
    """
    return tuple(fg[i] * alpha + bg[i] * (1 - alpha) for i in range(3))


def relative_luminance(rgb: tuple[float, float, float]) -> float:
    def linearize(c: float) -> float:
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (linearize(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    la, lb = relative_luminance(a), relative_luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


OKLCH = re.compile(
    r"--([a-z0-9-]+):\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:/\s*([\d.]+)%\s*)?\)"
)


def parse_theme(css: str, selector: str) -> dict[str, tuple[tuple[float, float, float], float]]:
    """Return {token: (srgb, alpha)} for one theme block."""
    start = css.index(selector + " {")
    depth, i = 0, start
    while i < len(css):
        if css[i] == "{":
            depth += 1
        elif css[i] == "}":
            depth -= 1
            if depth == 0:
                break
        i += 1
    block = css[start : i + 1]

    tokens: dict[str, tuple[tuple[float, float, float], float]] = {}
    for name, lightness, chroma, hue, alpha in OKLCH.findall(block):
        tokens[name] = (
            oklch_to_srgb(float(lightness), float(chroma), float(hue)),
            float(alpha) / 100 if alpha else 1.0,
        )
    return tokens


# (foreground, background, minimum, description). Backgrounds that are
# themselves translucent are flattened onto the page background first.
PAIRS = [
    ("muted-foreground", "background", TEXT_MIN, "secondary text on the page"),
    ("muted-foreground", "card", TEXT_MIN, "secondary text on a card"),
    ("foreground", "background", TEXT_MIN, "body text on the page"),
    ("foreground", "card", TEXT_MIN, "body text on a card"),
    ("success", "success-subtle", TEXT_MIN, "success badge"),
    ("warning", "warning-subtle", TEXT_MIN, "warning badge"),
    ("info", "info-subtle", TEXT_MIN, "info badge"),
    ("destructive", "destructive-subtle", TEXT_MIN, "destructive badge"),
    ("brand", "brand-subtle", TEXT_MIN, "brand badge"),
    ("success", "card", TEXT_MIN, "success text on a card"),
    ("warning", "card", TEXT_MIN, "warning text on a card"),
    ("info", "card", TEXT_MIN, "info text on a card"),
    ("destructive", "card", TEXT_MIN, "destructive text on a card"),
    ("primary-foreground", "primary", TEXT_MIN, "text on a primary button"),
    ("brand-foreground", "brand", TEXT_MIN, "text on a brand surface"),
    ("success-foreground", "success", TEXT_MIN, "text on a solid success fill"),
    ("warning-foreground", "warning", TEXT_MIN, "text on a solid warning fill"),
    ("info-foreground", "info", TEXT_MIN, "text on a solid info fill"),
    ("brand", "background", UI_MIN, "focus ring on the page"),
    ("brand", "card", UI_MIN, "focus ring on a card"),
    ("input", "background", UI_MIN, "input border on the page"),
    ("input", "card", UI_MIN, "input border on a card"),
    ("chart-1", "card", UI_MIN, "chart series 1"),
    ("chart-2", "card", UI_MIN, "chart series 2"),
    ("chart-3", "card", UI_MIN, "chart series 3"),
    ("chart-4", "card", UI_MIN, "chart series 4"),
    ("chart-5", "card", UI_MIN, "chart series 5"),
]


def main() -> int:
    css = CSS_PATH.read_text()
    failures: list[str] = []

    for theme_name, selector in (("light", ":root"), ("dark", ".dark")):
        tokens = parse_theme(css, selector)
        page_bg = tokens["background"][0]

        print(f"\n{theme_name}")
        for fg_name, bg_name, minimum, label in PAIRS:
            if fg_name not in tokens or bg_name not in tokens:
                failures.append(f"{theme_name}: missing token {fg_name} or {bg_name}")
                continue

            fg, fg_alpha = tokens[fg_name]
            bg, bg_alpha = tokens[bg_name]

            resolved_bg = composite(bg, bg_alpha, page_bg) if bg_alpha < 1 else bg
            resolved_fg = composite(fg, fg_alpha, resolved_bg) if fg_alpha < 1 else fg

            ratio = contrast(resolved_fg, resolved_bg)
            ok = ratio >= minimum
            print(
                f"  {'PASS' if ok else 'FAIL'}  {ratio:5.2f} (min {minimum})  "
                f"{label}  [{fg_name} on {bg_name}]"
            )
            if not ok:
                failures.append(
                    f"{theme_name}: {label} is {ratio:.2f}:1, needs {minimum}:1 "
                    f"({fg_name} on {bg_name})"
                )

    if failures:
        print(f"\n{len(failures)} contrast failure(s):", file=sys.stderr)
        for failure in failures:
            print(f"  - {failure}", file=sys.stderr)
        return 1

    print("\nAll token pairs meet their WCAG minimum.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
