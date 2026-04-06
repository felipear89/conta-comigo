"""
Categorization engine — matches keyword rules against transaction descriptions.
Returns (None, None) when no match is found.
"""
from __future__ import annotations

from typing import Literal

from app.core.supabase import get_supabase

CategorySource = Literal["rule"]


def load_categorization_context(
    descriptions_with_bank: list[tuple[str, str | None]],
    user_id: str,
) -> tuple[dict, list[dict]]:
    """
    Load the user's rules in one DB round-trip.
    Returns an empty dict (no memory) and the rules list.
    Used for CSV import preview batching.
    """
    supabase = get_supabase()
    rules_res = (
        supabase.table("category_rules")
        .select("keyword, category_id")
        .eq("user_id", user_id)
        .execute()
    )
    return {}, rules_res.data or []


def categorize_with_context(
    description: str,
    bank_category: str | None,
    memory_map: dict,
    rules: list[dict],
) -> tuple[str | None, CategorySource | None]:
    desc_lower = description.lower()
    bank_lower = (bank_category or "").lower()
    for rule in rules:
        kw = rule["keyword"].lower()
        if kw in desc_lower or kw in bank_lower:
            return rule["category_id"], "rule"
    return None, None
