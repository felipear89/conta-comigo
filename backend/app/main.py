from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import categories, imports, transactions, fixed_costs, forecast, individual_payments
from app.core.config import settings

_openapi_enabled = not settings.is_production

app = FastAPI(
    title="Conta Comigo API",
    docs_url="/docs" if _openapi_enabled else None,
    redoc_url="/redoc" if _openapi_enabled else None,
    openapi_url="/openapi.json" if _openapi_enabled else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(imports.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(fixed_costs.router)
app.include_router(forecast.router)
app.include_router(individual_payments.router)


@app.get("/health")
def health():
    return {"status": "ok"}
