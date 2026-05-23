create table if not exists credit_accounts (
  user_id text primary key,
  balance integer not null default 10 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists credit_transactions (
  id text primary key,
  user_id text not null references credit_accounts(user_id) on delete cascade,
  kind text not null check (kind in ('debit', 'refund', 'purchase', 'grant')),
  amount integer not null,
  balance_after integer not null,
  reason text not null,
  reference_id text,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_created_idx on credit_transactions(user_id, created_at desc);
