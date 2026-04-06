from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.models.schemas import (
    CategoryOut,
    CategoryCreateRequest,
    CategoryPatchRequest,
    CategoryRuleOut,
    CategoryRuleCreateRequest,
)
from app.core.supabase import get_supabase

router = APIRouter(prefix="/categories", tags=["categories"])


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("", response_model=list[CategoryOut])
async def list_categories(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    return supabase.table("categories").select("*").order("name").execute().data


@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(
    body: CategoryCreateRequest,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    result = supabase.table("categories").insert({
        "name": body.name,
        "color": body.color,
        "icon": body.icon,
    }).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create category")
    return result.data[0]


@router.patch("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: str,
    body: CategoryPatchRequest,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("categories").update(patch).eq("id", category_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Category not found")
    return result.data[0]


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: str,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    try:
        supabase.table("categories").delete().eq("id", category_id).execute()
    except Exception:
        raise HTTPException(
            status_code=409,
            detail="Category is in use by transactions or rules and cannot be deleted",
        )


# ── Category Rules ────────────────────────────────────────────────────────────

@router.get("/rules", response_model=list[CategoryRuleOut])
async def list_rules(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    return (
        supabase.table("category_rules")
        .select("*, category:categories(*)")
        .eq("user_id", user["id"])
        .order("keyword")
        .execute()
        .data
    )


@router.post("/rules", response_model=CategoryRuleOut, status_code=201)
async def create_rule(
    body: CategoryRuleCreateRequest,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    try:
        result = supabase.table("category_rules").insert({
            "keyword": body.keyword.lower().strip(),
            "category_id": body.category_id,
            "user_id": user["id"],
        }).execute()
    except Exception:
        raise HTTPException(status_code=409, detail="A rule with this keyword already exists")
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create rule")
    row = result.data[0]
    full = (
        supabase.table("category_rules")
        .select("*, category:categories(*)")
        .eq("id", row["id"])
        .single()
        .execute()
    )
    return full.data


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: str,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    supabase.table("category_rules").delete().eq("id", rule_id).eq("user_id", user["id"]).execute()

