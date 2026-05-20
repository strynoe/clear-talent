-- ── JOBS ──────────────────────────────────────────────────
create table jobs (
  id        bigint primary key generated always as identity,
  title     text not null,
  dept      text not null default 'Generel',
  type      text not null default 'Fuldtid',
  wolf1     text not null default 'Explorer',
  wolf2     text not null default '',
  status    text not null default 'active',
  created_at timestamptz default now()
);

-- ── CANDIDATES ────────────────────────────────────────────
create table candidates (
  id                  bigint primary key generated always as identity,
  job_id              bigint references jobs(id) on delete cascade not null,
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

-- RLS deaktiveret i v1 (slås til når auth er klar)
alter table jobs       disable row level security;
alter table candidates disable row level security;
