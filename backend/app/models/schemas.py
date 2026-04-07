from pydantic import BaseModel
from datetime import date
from typing import Literal

# Alias so patch schemas can annotate a field named `date` with type `date`
# without the field's default value (None) shadowing the type during annotation evaluation.
_Date = date


class TransactionBase(BaseModel):
    date: date
    description: str
    amount: float


class ImportPreviewTransaction(TransactionBase):
    installment: str | None = None
    bank_category: str | None = None
    suggested_category_id: str | None = None
    category_source: Literal["rule"] | None = None


class ConfirmImportRequest(BaseModel):
    transactions: list[ImportPreviewTransaction]
    bill_month: date


class UpdateCategoryRequest(BaseModel):
    category_id: str


class DeleteTransactionsRequest(BaseModel):
    ids: list[str]


class CategoryOut(BaseModel):
    id: str
    name: str
    color: str
    icon: str


class CategoryCreateRequest(BaseModel):
    name: str
    color: str = "#6b7280"
    icon: str = "💳"


class CategoryPatchRequest(BaseModel):
    name: str | None = None
    color: str | None = None
    icon: str | None = None


class CategoryRuleOut(BaseModel):
    id: str
    keyword: str
    category_id: str
    category: CategoryOut | None = None


class CategoryRuleCreateRequest(BaseModel):
    keyword: str
    category_id: str



# ── Fixed Costs ───────────────────────────────────────────────────────────────

class FixedCostOverrideOut(BaseModel):
    month: int
    amount: float


class FixedCostOut(BaseModel):
    id: str
    name: str
    year: int
    amount: float
    overrides: list[FixedCostOverrideOut] = []


class FixedCostCreateRequest(BaseModel):
    name: str
    year: int
    amount: float


class FixedCostPatchRequest(BaseModel):
    name: str | None = None
    amount: float | None = None


class FixedCostOverrideUpsertRequest(BaseModel):
    amount: float


# ── Individual Payments ───────────────────────────────────────────────────────

class IndividualPaymentOut(BaseModel):
    id: str
    description: str
    amount: float
    date: date
    category_id: str | None
    category: CategoryOut | None = None
    created_at: str


class IndividualPaymentCreateRequest(BaseModel):
    description: str
    amount: float
    date: date
    category_id: str | None = None


class IndividualPaymentPatchRequest(BaseModel):
    description: str | None = None
    amount: float | None = None
    date: _Date | None = None
    category_id: str | None = None


# ── Forecast ──────────────────────────────────────────────────────────────────

class ForecastItem(BaseModel):
    description: str
    amount: float
    installment: str  # e.g., "8/12"


class ForecastMonth(BaseModel):
    month: str  # "YYYY-MM"
    total: float
    items: list[ForecastItem]


class TransactionOut(TransactionBase):
    id: str
    installment: str | None = None
    bill_month: date | None = None
    category_id: str | None
    category: CategoryOut | None = None
    created_at: str
