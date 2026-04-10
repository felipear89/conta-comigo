"""
Parse credit card CSV exports from Bradesco into normalized transaction rows.

Expected format (tab-separated, UTF-8 or latin-1):
  Data de Compra | Nome no Cartão | Final do Cartão | Categoria | Descrição |
  Parcela | Valor (em US$) | Cotação (em R$) | Valor (em R$)

The first data row (bill payment) is skipped.
All other rows are imported regardless of sign (purchases and refunds).
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

    The first row (bill payment) is skipped; all other rows are returned.
    Negative amounts represent refunds/reversals and are included as-is.
    """
    content = await file.read()

    df = _read_dataframe(content)
    _validate_columns(df)

    # Skip the first row (bill payment from previous period)
    df = df.iloc[1:]

    rows: list[dict] = []

    for _, row in df.iterrows():
        try:
            amount = _parse_amount(str(row[COL_AMOUNT_BRL]))
        except ValueError:
            continue

        if amount == 0:
            continue

        description = str(row[COL_DESCRIPTION]).strip()
        if not description or description.lower() == "nan":
            continue

        try:
            parsed_date: date = pd.to_datetime(
                str(row[COL_DATE]).strip(), dayfirst=True
            ).date()
        except Exception:
            continue

        bank_category = str(row[COL_BANK_CATEGORY]).strip()
        installment = str(row[COL_INSTALLMENT]).strip()

        rows.append(
            {
                "date": parsed_date.isoformat(),
                "description": description,
                "amount": amount,
                "installment": None if installment in ("Única", "nan", "") else installment,
                "bank_category": None if bank_category in ("-", "nan", "") else bank_category,
            }
        )

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
