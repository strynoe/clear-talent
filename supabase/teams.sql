-- ── TEAMS ─────────────────────────────────────────────────
create table teams (
  id          bigint primary key generated always as identity,
  name        text not null,
  description text not null default '',
  created_at  timestamptz default now()
);

-- ── EMPLOYEES ─────────────────────────────────────────────
create table employees (
  id                  bigint primary key generated always as identity,
  team_id             bigint references teams(id) on delete cascade not null,
  name                text not null,
  score               int not null default 0,
  wolf                text not null default '',
  wolf_sec            text not null default '',
  grad                text not null default '',
  bars                jsonb not null default '[]',
  verdict             text not null default '',
  headline            text not null default '',
  summary             text not null default '',
  wolf_reasoning      text not null default '',
  flags               jsonb not null default '[]',
  strengths           jsonb not null default '[]',
  risks               jsonb not null default '[]',
  interview_questions jsonb not null default '[]',
  created_at          timestamptz default now()
);

-- ── UDVID JOBS ────────────────────────────────────────────
alter table jobs add column if not exists team_id    bigint references teams(id) on delete set null;
alter table jobs add column if not exists description text not null default '';

alter table teams     disable row level security;
alter table employees disable row level security;
