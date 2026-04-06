-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#6b7280',
  icon text not null default '💳',
  created_at timestamptz not null default now()
);

-- Seed default categories
insert into categories (name, color, icon) values
  ('Alimentação',       '#f97316', '🍽️'),
  ('Supermercado',      '#84cc16', '🛒'),
  ('Transporte',        '#3b82f6', '🚗'),
  ('Saúde',             '#ec4899', '🏥'),
  ('Educação',          '#8b5cf6', '📚'),
  ('Lazer',             '#f59e0b', '🎉'),
  ('Vestuário',         '#06b6d4', '👕'),
  ('Casa',              '#10b981', '🏠'),
  ('Assinaturas',       '#6366f1', '📱'),
  ('Viagem',            '#ef4444', '✈️'),
  ('Serviços',          '#78716c', '🔧'),
  ('Outros',            '#9ca3af', '📦')
on conflict (name) do nothing;

-- Transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric(10, 2) not null,
  installment text,           -- e.g. "7/12", null for single payments
  bank_category text,         -- raw category string from the CSV
  category_id uuid references categories(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_id_idx on transactions(user_id);
create index if not exists transactions_date_idx on transactions(date desc);
create index if not exists transactions_category_id_idx on transactions(category_id);

-- Manual keyword rules
create table if not exists category_rules (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  category_id uuid not null references categories(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Learned merchant → category mappings
create table if not exists category_memory (
  id uuid primary key default gen_random_uuid(),
  merchant_key text not null unique,
  category_id uuid not null references categories(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index if not exists category_memory_merchant_key_idx on category_memory(merchant_key);

-- Row Level Security
alter table transactions enable row level security;
create policy "users can access their own transactions"
  on transactions for all
  using (auth.uid() = user_id);

-- categories, category_rules, category_memory are shared/global (no RLS needed)
