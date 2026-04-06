from fastapi import APIRouter, Depends, Query
from fastapi import HTTPException
from app.core.auth import get_current_user
from app.models.schemas import TransactionOut, UpdateCategoryRequest, DeleteTransactionsRequest
from app.core.supabase import get_supabase

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionOut])
async def list_transactions(
    category_id: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    bill_month: str | None = Query(None),
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    query = (
        supabase.table("transactions")
        .select("*, category:categories(*)")
        .eq("user_id", user["id"])
        .order("date", desc=True)
    )
    if category_id:
        query = query.eq("category_id", category_id)
    if bill_month:
        query = query.eq("bill_month", bill_month)
    if date_from:
        query = query.gte("date", date_from)
    if date_to:
        query = query.lte("date", date_to)

    return query.execute().data


@router.patch("/{transaction_id}/category")
async def update_category(
    transaction_id: str,
    body: UpdateCategoryRequest,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()

    # Fetch transaction to get description for memory update
    tx = (
        supabase.table("transactions")
        .select("description")
        .eq("id", transaction_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not tx.data:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Update the transaction
    supabase.table("transactions").update({"category_id": body.category_id}).eq("id", transaction_id).execute()

    return {"ok": True}


@router.delete("")
async def delete_transactions(
    body: DeleteTransactionsRequest,
    user: dict = Depends(get_current_user),
):
    if not body.ids:
        raise HTTPException(status_code=400, detail="No transaction IDs provided")

    supabase = get_supabase()
    supabase.table("transactions").delete().in_("id", body.ids).eq("user_id", user["id"]).execute()
    return {"deleted": len(body.ids)}
