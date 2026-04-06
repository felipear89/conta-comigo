-- Add bill_month to transactions
-- Stores the first day of the billing month (e.g. 2026-04-01 for the April bill).
-- Nullable so existing rows are unaffected.
alter table transactions add column if not exists bill_month date;

create index if not exists transactions_bill_month_idx on transactions(bill_month);
