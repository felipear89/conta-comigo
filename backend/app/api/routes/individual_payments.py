from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import get_current_user
from app.core.supabase import get_supabase
from app.models.schemas import (
    IndividualPaymentCreateRequest,
    IndividualPaymentOut,
    IndividualPaymentPatchRequest,
)

router = APIRouter(prefix="/individual-payments", tags=["individual-payments"])


def _get_or_404(supabase, payment_id: str, user_id: str) -> dict:
    result = (
        supabase.table("individual_payments")
        .select("*")
        .eq("id", payment_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Payment not found")
    return result.data[0]


@router.get("", response_model=list[IndividualPaymentOut])
async def list_payments(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    query = (
        supabase.table("individual_payments")
        .select("*, category:categories(*)")
        .eq("user_id", user["id"])
        .order("date", desc=True)
    )
    if date_from:
        query = query.gte("date", date_from)
    if date_to:
        query = query.lte("date", date_to)
    return query.execute().data


@router.post("", response_model=IndividualPaymentOut, status_code=201)
async def create_payment(
    body: IndividualPaymentCreateRequest,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    result = (
        supabase.table("individual_payments")
        .insert({
            "user_id": user["id"],
            "description": body.description,
            "amount": body.amount,
            "date": body.date.isoformat(),
            "category_id": body.category_id,
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create payment")

    row = result.data[0]
    if body.category_id:
        cat = supabase.table("categories").select("*").eq("id", body.category_id).execute()
        row["category"] = cat.data[0] if cat.data else None
    else:
        row["category"] = None
    return row


@router.patch("/{payment_id}", response_model=IndividualPaymentOut)
async def update_payment(
    payment_id: str,
    body: IndividualPaymentPatchRequest,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    _get_or_404(supabase, payment_id, user["id"])

    patch = {k: (v.isoformat() if hasattr(v, "isoformat") else v)
             for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update")

    supabase.table("individual_payments").update(patch).eq("id", payment_id).execute()

    result = (
        supabase.table("individual_payments")
        .select("*, category:categories(*)")
        .eq("id", payment_id)
        .execute()
    )
    return result.data[0]


@router.delete("/{payment_id}", status_code=204)
async def delete_payment(
    payment_id: str,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    _get_or_404(supabase, payment_id, user["id"])
    supabase.table("individual_payments").delete().eq("id", payment_id).execute()
