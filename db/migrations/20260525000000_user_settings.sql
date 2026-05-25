create table if not exists user_settings (
  user_id text primary key,
  image_ai_provider text not null default 'google' check (image_ai_provider in ('google', 'openai')),
  image_model text not null default 'gemini-2.5-flash-image',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
