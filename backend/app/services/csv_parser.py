"""
Parse credit card CSV exports from Bradesco into normalized transaction rows.

Expected format (tab-separated, UTF-8 or latin-1):
  Data de Compra | Nome no Cartão | Final do Cartão | Categoria | Descrição |
  Parcela | Valor (em US$) | Cotação (em R$) | Valor (em R$)

Rows with a negative amount (payments, refunds) are excluded.
Rows where Descrição is empty or Categoria is '-' and amount ≤ 0 are skipped.
"""
import io
from datetime import date
import pandas as pd
from fastapi import UploadFile, HTTPException

COL_DATE = "Data de Compra"
COL_DESCRIPTION = "Descrição"
COL_BANK_CATEGORY = "Categoria"
COL_INSTALLMENT = "Parcela"
COL_AMOUNT_BRL = "Valor (em R$)"


async def parse_csv(file: UploadFile) -> list[dict]:
    """
    Return a list of dicts with keys:
      date (str ISO), description (str), amount (float),
      installment (str | None), bank_category (str | None)

    Only positive-amount rows (actual purchases) are returned.
    """
    content = await file.read()

    df = _read_dataframe(content)
    _validate_columns(df)

    positive_rows: list[dict] = []
    reversal_amounts: list[float] = []

    for _, row in df.iterrows():
        try:
            amount = _parse_amount(str(row[COL_AMOUNT_BRL]))
        except ValueError:
            continue

        description = str(row[COL_DESCRIPTION]).strip()
        if not description or description.lower() == "nan":
            continue

        if amount < 0:
            reversal_amounts.append(abs(amount))
            continue

        if amount == 0:
            continue

        try:
            parsed_date: date = pd.to_datetime(
                str(row[COL_DATE]).strip(), dayfirst=True
            ).date()
        except Exception:
            continue

        bank_category = str(row[COL_BANK_CATEGORY]).strip()
        installment = str(row[COL_INSTALLMENT]).strip()

        positive_rows.append(
            {
                "date": parsed_date.isoformat(),
                "description": description,
                "amount": amount,
                "installment": None if installment in ("Única", "nan", "") else installment,
                "bank_category": None if bank_category in ("-", "nan", "") else bank_category,
            }
        )

    # Cancel out charges that have a matching reversal (same absolute amount, first-match)
    rows: list[dict] = []
    for r in positive_rows:
        try:
            idx = next(i for i, v in enumerate(reversal_amounts) if abs(v - r["amount"]) < 0.01)
            reversal_amounts.pop(idx)  # consume the reversal
        except StopIteration:
            rows.append(r)

    if not rows:
        raise HTTPException(status_code=422, detail="No valid transactions found in CSV")

    return rows


def _read_dataframe(content: bytes) -> pd.DataFrame:
    """Try tab-separated first (Bradesco format), fall back to comma-separated."""
    for encoding in ("utf-8", "latin-1"):
        for sep in ("\t", ";", ","):
            try:
                df = pd.read_csv(
                    io.BytesIO(content),
                    sep=sep,
                    encoding=encoding,
                    dtype=str,
                    skipinitialspace=True,
                )
                if len(df.columns) > 3:
                    return df
            except Exception:
                continue
    raise HTTPException(status_code=422, detail="Could not parse the uploaded file")


def _validate_columns(df: pd.DataFrame) -> None:
    required = {COL_DATE, COL_DESCRIPTION, COL_AMOUNT_BRL}
    missing = required - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing expected columns: {', '.join(missing)}. "
            f"Got: {', '.join(df.columns)}",
        )


def _parse_amount(value: str) -> float:
    """Parse Brazilian number format: '1.234,56' → 1234.56, '-8472.63' → -8472.63."""
    cleaned = value.strip().replace("R$", "").replace("\xa0", "").strip()
    # If both comma and period present, treat comma as decimal separator
    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")
    return float(cleaned)
