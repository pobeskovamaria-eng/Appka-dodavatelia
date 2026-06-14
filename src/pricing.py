"""Indicative B2B wholesale price ranges per material x tier.

These are MARKET ESTIMATES based on typical B2B mill quotations
(before VAT, shipping and finishing surcharges). Real prices come
only from a written quote and depend on quality, colour, MOQ,
finishing and season. Use only as a rough cost-class indicator.
"""

from __future__ import annotations

# (low, high) in EUR per meter / EUR per kg for jersey.
TIER_RANGES_EUR_PER_METER: dict[str, dict[str, tuple[int, int]]] = {
    "silk": {
        "€":    (12, 22),
        "€€":   (22, 45),
        "€€€":  (45, 90),
        "€€€€": (90, 220),
    },
    "cotton": {
        "€":    (5, 10),
        "€€":   (10, 22),
        "€€€":  (22, 45),
        "€€€€": (45, 90),
    },
    "tencel": {
        "€":    (8, 15),
        "€€":   (15, 30),
        "€€€":  (30, 55),
        "€€€€": (55, 100),
    },
    "bamboo": {
        "€":    (10, 20),
        "€€":   (20, 40),
        "€€€":  (40, 70),
        "€€€€": (70, 120),
    },
    "linen": {
        "€":    (8, 18),
        "€€":   (18, 35),
        "€€€":  (35, 60),
        "€€€€": (60, 100),
    },
    "wool": {
        "€":    (15, 30),
        "€€":   (30, 60),
        "€€€":  (60, 110),
        "€€€€": (110, 220),
    },
}


def indicative_range(material: str, tier: str | None) -> tuple[int, int] | None:
    if not tier:
        return None
    return TIER_RANGES_EUR_PER_METER.get(material, {}).get(tier)


def format_range(low: int, high: int) -> str:
    return f"~{low}–{high} €/m"
