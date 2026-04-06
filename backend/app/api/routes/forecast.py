from calendar import monthrange
from datetime import date

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.core.supabase import get_supabase
from app.models.schemas import ForecastItem, ForecastMonth

router = APIRouter(prefix="/forecast", tags=["forecast"])


def _add_months(d: date, delta: int) -> date:
    """Return the first day of the month `delta` months after `d`."""
    m = d.month - 1 + delta
    year = d.year + m // 12
    month = m % 12 + 1
    return date(year, month, 1)


@router.get("", response_model=list[ForecastMonth])
async def get_forecast(user: dict = Depends(get_current_user)):
    supabase = get_supabase()

    result = (
        supabase.table("transactions")
        .select("description, amount, installment, bill_month")
        .eq("user_id", user["id"])
        .not_.is_("installment", "null")
        .not_.is_("bill_month", "null")
        .execute()
    )

    if not result.data:
        return []

    # Deduplicate by (description, total_installments), keeping the most recent bill_month
    groups: dict[tuple, dict] = {}
    for txn in result.data:
        raw = txn.get("installment") or ""
        parts = raw.split("/")
        if len(parts) != 2:
            continue
        try:
            current, total = int(parts[0]), int(parts[1])
        except ValueError:
            continue
        if current >= total:
            continue  # fully paid, nothing to forecast

        bill_month = date.fromisoformat(txn["bill_month"])
        key = (txn["description"], total)
        if key not in groups or bill_month > groups[key]["bill_month"]:
            groups[key] = {
                "current": current,
                "total": total,
                "amount": float(txn["amount"]),
                "bill_month": bill_month,
                "description": txn["description"],
            }

    # Project remaining installments into future months
    today_first = date.today().replace(day=1)
    forecast: dict[str, list[ForecastItem]] = {}

    for info in groups.values():
        for i in range(info["current"] + 1, info["total"] + 1):
            delta = i - info["current"]
            future_month = _add_months(info["bill_month"], delta)
            if future_month <= today_first:
                continue
            month_key = future_month.strftime("%Y-%m")
            forecast.setdefault(month_key, []).append(
                ForecastItem(
                    description=info["description"],
                    amount=info["amount"],
                    installment=f"{i}/{info['total']}",
                )
            )

    return [
        ForecastMonth(
            month=month_key,
            total=round(sum(item.amount for item in forecast[month_key]), 2),
            items=sorted(forecast[month_key], key=lambda x: x.description),
        )
        for month_key in sorted(forecast.keys())
    ]
