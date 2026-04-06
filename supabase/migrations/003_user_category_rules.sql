-- Bind category_rules to users

-- 1. Drop the global unique constraint on keyword (keywords are now unique per user)
alter table category_rules drop constraint if exists category_rules_keyword_key;

-- 2. Add user_id column (nullable first to handle existing rows)
alter table category_rules add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 3. Drop existing rows (they are global/unowned — no user to attribute them to)
delete from category_rules where user_id is null;

-- 4. Make user_id required
alter table category_rules alter column user_id set not null;

-- 5. Unique constraint is now per user
alter table category_rules add constraint category_rules_user_keyword_key unique (user_id, keyword);

-- 6. Index for fast per-user lookups
create index if not exists category_rules_user_id_idx on category_rules(user_id);

-- 7. Enable RLS
alter table category_rules enable row level security;
create policy "users manage their own category rules"
  on category_rules for all using (auth.uid() = user_id);
