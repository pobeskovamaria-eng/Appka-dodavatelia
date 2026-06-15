"""Live web search to supplement the curated database.

Uses DuckDuckGo (no API key required). The query uses proper search
operators (quoted phrases, OR groups, exclusion) so the search engine
treats it as one focused query, not a bag of words. A post-filter then
drops results that clearly don't match the brief (marketplaces, blogs,
unrelated topics).
"""

from __future__ import annotations

from typing import Iterable


MATERIAL_KEYWORDS: dict[str, list[str]] = {
    "silk": ["silk", "soie", "seta", "hodvab", "hodváb", "soieries"],
    "cotton": ["cotton", "coton", "cotone", "bavln"],
    "tencel": ["tencel", "lyocell"],
    "bamboo": ["bamboo", "bambou", "bambus"],
}

SUPPLIER_KEYWORDS: list[str] = [
    "manufacturer", "mill", "weaver", "tessitura", "soieries",
    "fabric", "tissu", "tessuto", "textile", "weaving",
]

BLOCKLIST_KEYWORDS: list[str] = [
    "aliexpress", "amazon.", "ebay.", "etsy.", "alibaba",
    "wholesale", "wholesaler", "reseller", "dropship",
    "wikipedia", "pinterest", "youtube", "tiktok", "instagram.com",
    "reddit", "quora", "blogspot", "wordpress.com",
    "buy silk pajamas", "silk pillowcase",
]


def build_query(
    materials: Iterable[str],
    mommi: Iterable[int],
    only_mulberry: bool,
    dyeing_required: bool,
    regions: Iterable[str],
) -> str:
    """Builds a focused DDG query using quoted phrases and OR groups."""
    parts: list[str] = []

    mats = list(materials)

    if "silk" in mats:
        if only_mulberry:
            parts.append('"mulberry silk"')
        else:
            parts.append("silk")
        mommi_list = list(mommi)
        if mommi_list:
            mommi_alts: list[str] = []
            for m in mommi_list:
                mommi_alts.append(f'"{m} momme"')
                mommi_alts.append(f'"{m} mommi"')
                mommi_alts.append(f'"{m}mm silk"')
            parts.append("(" + " OR ".join(mommi_alts) + ")")

    if "cotton" in mats:
        parts.append('("100% cotton" OR "organic cotton")')

    if "tencel" in mats:
        parts.append("(Tencel OR Lyocell)")

    if "bamboo" in mats:
        parts.append('("bamboo fabric" OR "bamboo fibre" OR "bamboo lyocell")')

    parts.append(
        '("fabric manufacturer" OR "fabric mill" OR weaver OR tessitura OR soieries)'
    )
    parts.append("-wholesale -aliexpress -amazon -etsy -ebay -alibaba -pinterest")

    if dyeing_required:
        parts.append('(dyeing OR "dye house" OR teinture)')

    region_list = list(regions)
    if "Europe" in region_list:
        parts.append(
            '(Italy OR Portugal OR France OR Spain OR Germany OR "United Kingdom" OR Switzerland)'
        )
    if "Asia" in region_list:
        parts.append("(China OR India OR Japan OR Vietnam OR Thailand)")

    return " ".join(parts)


def search_web(query: str, max_results: int = 25) -> list[dict]:
    """Returns a list of {title, href, body} dicts. Empty list on failure."""
    try:
        from duckduckgo_search import DDGS
    except ImportError:
        return []

    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results, safesearch="off"))
        return results or []
    except Exception:
        return []


def filter_results(
    results: list[dict],
    materials: Iterable[str],
    strict: bool = True,
) -> list[dict]:
    """Drops results that don't mention the requested material or that
    come from blocklisted domains/topics. Only used when strict mode is on.
    """
    if not strict:
        return results

    mats = list(materials)
    must_any: list[str] = []
    for m in mats:
        must_any.extend(MATERIAL_KEYWORDS.get(m, [m]))
    # Always require at least one supplier-ish keyword too
    out: list[dict] = []
    for r in results:
        text_parts = [
            (r.get("title") or ""),
            (r.get("body") or ""),
            (r.get("href") or ""),
        ]
        text = " ".join(text_parts).lower()

        if any(b in text for b in BLOCKLIST_KEYWORDS):
            continue
        if must_any and not any(k.lower() in text for k in must_any):
            continue
        if not any(k in text for k in SUPPLIER_KEYWORDS):
            continue
        out.append(r)
    return out
