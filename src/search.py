"""Filtering logic for the curated supplier database."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "suppliers.json"


@dataclass
class Filters:
    materials: set[str] = field(default_factory=set)
    only_mulberry: bool = False
    mommi: set[int] = field(default_factory=set)
    dyeing_required: bool = False
    exclude_resellers: bool = True
    exclude_synthetic_satin: bool = True
    regions: set[str] = field(default_factory=set)
    certifications: set[str] = field(default_factory=set)
    verified_only: bool = False
    price_tiers: set[str] = field(default_factory=set)


def load_suppliers() -> list[dict]:
    with DATA_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("suppliers", [])


def _material_match(supplier: dict, materials: Iterable[str]) -> bool:
    s_materials = {m.lower() for m in supplier.get("materials", [])}
    return all(m.lower() in s_materials for m in materials)


def _silk_match(supplier: dict, only_mulberry: bool, mommi: Iterable[int]) -> bool:
    silk = supplier.get("silk")
    if not silk:
        return False
    if only_mulberry and not silk.get("mulberry"):
        return False
    if mommi:
        offered = set(silk.get("mommi", []) or [])
        if not set(mommi).issubset(offered):
            # require all requested mommi values to be offered
            return False
    return True


def apply_filters(suppliers: list[dict], f: Filters) -> list[dict]:
    out: list[dict] = []
    resellers_types = {"reseller", "retailer", "distributor"}

    for s in suppliers:
        if f.exclude_resellers and s.get("type", "").lower() in resellers_types:
            continue

        if f.verified_only and not s.get("verified"):
            continue

        if f.regions and s.get("region", "") not in f.regions:
            continue

        if f.materials and not _material_match(s, f.materials):
            continue

        # Silk-specific constraints only apply if silk is requested
        if "silk" in {m.lower() for m in f.materials}:
            if not _silk_match(s, f.only_mulberry, f.mommi):
                continue

        if f.dyeing_required and not s.get("dyeing"):
            continue

        if f.certifications:
            s_certs = {c.upper() for c in s.get("certifications", [])}
            wanted = {c.upper() for c in f.certifications}
            if not wanted.issubset(s_certs):
                continue

        if f.price_tiers:
            s_tier = (s.get("price") or {}).get("tier")
            if s_tier not in f.price_tiers:
                continue

        out.append(s)

    return out


def all_certifications(suppliers: list[dict]) -> list[str]:
    s: set[str] = set()
    for sup in suppliers:
        for c in sup.get("certifications", []) or []:
            s.add(c)
    return sorted(s)
