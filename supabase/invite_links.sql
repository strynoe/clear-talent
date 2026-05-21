create table invite_links (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('job','team')),
  target_id  bigint not null,
  label      text not null default '',
  created_at timestamptz default now(),
  expires_at timestamptz,
  used_at    timestamptz
);
alter table invite_links disable row level security;
