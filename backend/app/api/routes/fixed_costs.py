from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.supabase import get_supabase
from app.models.schemas import (
    FixedCostOut,
    FixedCostCreateRequest,
    FixedCostPatchRequest,
    FixedCostOverrideOut,
    FixedCostOverrideUpsertRequest,
)

router = APIRouter(prefix="/fixed-costs", tags=["fixed-costs"])


def _get_cost_or_404(supabase, cost_id: str, user_id: str) -> dict:
    """Fetch a fixed cost by id+user_id, raising 404 if not found."""
    result = (
        supabase.table("fixed_costs")
        .select("*")
        .eq("id", cost_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Fixed cost not found")
    return result.data[0]


def _fetch_cost_with_overrides(supabase, cost_id: str, user_id: str) -> dict:
    """Fetch a single fixed cost with its overrides."""
    result = (
        supabase.table("fixed_costs")
        .select("*, overrides:fixed_cost_overrides(*)")
        .eq("id", cost_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Fixed cost not found")
    return result.data[0]


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[FixedCostOut])
async def list_fixed_costs(
    year: int,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    result = (
        supabase.table("fixed_costs")
        .select("*, overrides:fixed_cost_overrides(*)")
        .eq("user_id", user["id"])
        .eq("year", year)
        .order("name")
        .execute()
    )
    return result.data


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=FixedCostOut, status_code=201)
async def create_fixed_cost(
    body: FixedCostCreateRequest,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    try:
        result = supabase.table("fixed_costs").insert({
            "user_id": user["id"],
            "name": body.name,
            "year": body.year,
            "amount": body.amount,
        }).execute()
    except Exception as e:
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(status_code=409, detail="A cost with this name already exists for this year")
        raise HTTPException(status_code=400, detail="Failed to create fixed cost")

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create fixed cost")

    cost = result.data[0]
    cost["overrides"] = []
    return cost


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/{cost_id}", response_model=FixedCostOut)
async def update_fixed_cost(
    cost_id: str,
    body: FixedCostPatchRequest,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    _get_cost_or_404(supabase, cost_id, user["id"])

    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update")

    supabase.table("fixed_costs").update(patch).eq("id", cost_id).execute()
    return _fetch_cost_with_overrides(supabase, cost_id, user["id"])


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{cost_id}", status_code=204)
async def delete_fixed_cost(
    cost_id: str,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    _get_cost_or_404(supabase, cost_id, user["id"])
    supabase.table("fixed_costs").delete().eq("id", cost_id).execute()


# ── Overrides ─────────────────────────────────────────────────────────────────

@router.put("/{cost_id}/overrides/{month}", response_model=FixedCostOverrideOut)
async def upsert_override(
    cost_id: str,
    month: int,
    body: FixedCostOverrideUpsertRequest,
    user: dict = Depends(get_current_user),
):
    if month < 1 or month > 12:
        raise HTTPException(status_code=422, detail="Month must be between 1 and 12")

    supabase = get_supabase()
    _get_cost_or_404(supabase, cost_id, user["id"])

    result = (
        supabase.table("fixed_cost_overrides")
        .upsert(
            {"fixed_cost_id": cost_id, "month": month, "amount": body.amount},
            on_conflict="fixed_cost_id,month",
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to save override")
    return result.data[0]


@router.delete("/{cost_id}/overrides/{month}", status_code=204)
async def delete_override(
    cost_id: str,
    month: int,
    user: dict = Depends(get_current_user),
):
    if month < 1 or month > 12:
        raise HTTPException(status_code=422, detail="Month must be between 1 and 12")

    supabase = get_supabase()
    _get_cost_or_404(supabase, cost_id, user["id"])

    supabase.table("fixed_cost_overrides").delete().eq("fixed_cost_id", cost_id).eq("month", month).execute()
