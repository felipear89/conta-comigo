create table if not exists individual_payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount      numeric(10, 2) not null,
  date        date not null,
  category_id uuid references categories(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists individual_payments_user_id_idx on individual_payments(user_id);
create index if not exists individual_payments_date_idx on individual_payments(date desc);

alter table individual_payments enable row level security;
create policy "users manage their own individual payments"
  on individual_payments for all using (auth.uid() = user_id);
