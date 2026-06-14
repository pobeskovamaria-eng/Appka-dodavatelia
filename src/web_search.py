"""Live web search to supplement the curated database.

Uses DuckDuckGo (no API key required) so the app works out of the box.
Results are intentionally framed as candidates — they still need manual
verification (is it a manufacturer, do they match the ethical principles).
"""

from __future__ import annotations

from typing import Iterable


def build_query(
    materials: Iterable[str],
    mommi: Iterable[int],
    only_mulberry: bool,
    dyeing_required: bool,
    regions: Iterable[str],
) -> str:
    parts: list[str] = []

    mats = list(materials)
    if "silk" in mats:
        silk_terms = []
        if only_mulberry:
            silk_terms.append("mulberry silk")
        else:
            silk_terms.append("silk")
        mommi_list = list(mommi)
        if mommi_list:
            silk_terms.append(" ".join(f"{m}mm" for m in mommi_list))
        parts.append(" ".join(silk_terms))
    if "cotton" in mats:
        parts.append("100% cotton")
    if "tencel" in mats:
        parts.append("Tencel lyocell")
    if "bamboo" in mats:
        parts.append("bamboo fabric")

    parts.append("fabric manufacturer mill")
    parts.append("-wholesale -reseller -aliexpress -amazon -etsy")

    if dyeing_required:
        parts.append("dyeing")

    region_list = list(regions)
    if region_list:
        if "Europe" in region_list:
            parts.append("Europe Italy Portugal France")
        if "Asia" in region_list:
            parts.append("Asia China India Japan")

    return " ".join(parts)


def search_web(query: str, max_results: int = 15) -> list[dict]:
    """Returns a list of {title, href, body} dicts. Empty list on failure."""
    try:
        from duckduckgo_search import DDGS
    except ImportError:
        return []

    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        return results or []
    except Exception:
        return []
