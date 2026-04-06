from fastapi import APIRouter, Depends, File, UploadFile

from app.core.auth import get_current_user
from app.core.supabase import get_supabase
from app.models.schemas import ConfirmImportRequest, ImportPreviewTransaction
from app.services.categorization import categorize_with_context, load_categorization_context
from app.services.csv_parser import parse_csv

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/preview", response_model=list[ImportPreviewTransaction])
async def preview_import(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    rows = await parse_csv(file)
    pairs = [(row["description"], row.get("bank_category")) for row in rows]
    memory_map, rules = load_categorization_context(pairs, user["id"])

    previews = []
    for row in rows:
        category_id, source = categorize_with_context(
            row["description"],
            row.get("bank_category"),
            memory_map,
            rules,
        )
        previews.append(
            ImportPreviewTransaction(
                date=row["date"],
                description=row["description"],
                amount=row["amount"],
                installment=row.get("installment"),
                bank_category=row.get("bank_category"),
                suggested_category_id=category_id,
                category_source=source,
            )
        )
    return previews


@router.post("/confirm")
async def confirm_import(
    body: ConfirmImportRequest,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    bill_month_str = body.bill_month.replace(day=1).isoformat()
    records = [
        {
            "date": t.date.isoformat(),
            "description": t.description,
            "amount": t.amount,
            "installment": t.installment,
            "bank_category": t.bank_category,
            "category_id": t.suggested_category_id,
            "bill_month": bill_month_str,
            "user_id": user["id"],
        }
        for t in body.transactions
    ]
    supabase.table("transactions").insert(records).execute()
    return {"inserted": len(records)}
