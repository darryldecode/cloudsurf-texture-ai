create table if not exists projects (
  id text primary key,
  user_id text not null,
  name text not null,
  description text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists workflows (
  id text primary key,
  user_id text not null,
  project_id text not null references projects(id) on delete cascade,
  name text not null,
  exclusions text not null default '',
  images jsonb not null default '[]'::jsonb,
  atlases jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  status_message text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists projects_user_updated_idx on projects(user_id, updated_at desc);
create index if not exists workflows_user_project_updated_idx on workflows(user_id, project_id, updated_at desc);
