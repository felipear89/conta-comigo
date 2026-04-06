import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import UploadFile, HTTPException
from app.services.csv_parser import parse_csv, _parse_amount


def make_upload_file(content: str) -> UploadFile:
    mock = MagicMock(spec=UploadFile)
    mock.read = AsyncMock(return_value=content.encode("utf-8"))
    return mock


HEADER = (
    "Data de Compra\tNome no Cartão\tFinal do Cartão\tCategoria\t"
    "Descrição\tParcela\tValor (em US$)\tCotação (em R$)\tValor (em R$)"
)


@pytest.mark.asyncio
async def test_parse_standard_rows():
    rows_tsv = (
        f"{HEADER}\n"
        "04/02/2026\tFELIPE\t7313\tRestaurante\tICI GASTRONOMIA\tÚnica\t0\t0\t183.06\n"
        "02/08/2025\tFELIPE\t7313\tEducacional\tPAYPAL *AOVS SISTEMAS\t7/12\t0\t0\t208.60\n"
    )
    rows = await parse_csv(make_upload_file(rows_tsv))
    assert len(rows) == 2
    assert rows[0]["description"] == "ICI GASTRONOMIA"
    assert rows[0]["amount"] == 183.06
    assert rows[0]["date"] == "2026-02-04"
    assert rows[0]["installment"] is None  # Única → None
    assert rows[1]["installment"] == "7/12"


@pytest.mark.asyncio
async def test_skips_payments_and_refunds():
    rows_tsv = (
        f"{HEADER}\n"
        "10/02/2026\tFELIPE\t4010\t-\tInclusao de Pagamento\tÚnica\t0\t0\t-8472.63\n"
        "28/02/2026\tFELIPE\t4010\t-\tEstorno Tarifa\tÚnica\t0\t0\t-98.00\n"
        "04/02/2026\tFELIPE\t7313\tRestaurante\tICI GASTRONOMIA\tÚnica\t0\t0\t183.06\n"
    )
    rows = await parse_csv(make_upload_file(rows_tsv))
    assert len(rows) == 1
    assert rows[0]["description"] == "ICI GASTRONOMIA"


@pytest.mark.asyncio
async def test_bank_category_captured():
    rows_tsv = (
        f"{HEADER}\n"
        "04/02/2026\tFELIPE\t7313\tSupermercados / Mercearia\tMERCADO ESTACAO\tÚnica\t0\t0\t50.49\n"
    )
    rows = await parse_csv(make_upload_file(rows_tsv))
    assert rows[0]["bank_category"] == "Supermercados / Mercearia"


@pytest.mark.asyncio
async def test_missing_required_columns_raises():
    bad_csv = "foo\tbar\nbaz\t1\n"
    with pytest.raises(HTTPException) as exc_info:
        await parse_csv(make_upload_file(bad_csv))
    assert exc_info.value.status_code == 422


def test_parse_amount_formats():
    assert _parse_amount("183.06") == 183.06
    assert _parse_amount("-8472.63") == -8472.63
    assert _parse_amount("1.234,56") == 1234.56
    assert _parse_amount("208,60") == 208.60
