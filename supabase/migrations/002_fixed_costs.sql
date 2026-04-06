-- Fixed cost definitions (one row per named cost, per user, per year)
create table if not exists fixed_costs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  year        int  not null,
  amount      numeric(10, 2) not null,
  created_at  timestamptz not null default now(),
  constraint fixed_costs_user_year_name_key unique (user_id, year, name)
);

create index if not exists fixed_costs_user_year_idx on fixed_costs(user_id, year);

-- Monthly overrides (sparse: only months that differ from default are stored)
create table if not exists fixed_cost_overrides (
  id             uuid primary key default gen_random_uuid(),
  fixed_cost_id  uuid not null references fixed_costs(id) on delete cascade,
  month          int  not null check (month between 1 and 12),
  amount         numeric(10, 2) not null,
  created_at     timestamptz not null default now(),
  constraint fixed_cost_overrides_cost_month_key unique (fixed_cost_id, month)
);

alter table fixed_costs enable row level security;
create policy "users manage their own fixed costs"
  on fixed_costs for all using (auth.uid() = user_id);

alter table fixed_cost_overrides enable row level security;
create policy "users manage their own fixed cost overrides"
  on fixed_cost_overrides for all
  using (fixed_cost_id in (select id from fixed_costs where user_id = auth.uid()));
