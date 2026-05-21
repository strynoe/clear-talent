-- ── ORGANISATIONS ─────────────────────────────────────────
create table if not exists organizations (
  id         bigint primary key generated always as identity,
  name       text not null,
  created_at timestamptz default now()
);

create table if not exists org_members (
  org_id     bigint references organizations(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  primary key (org_id, user_id)
);

-- No RLS needed on org tables — they only hold metadata
alter table organizations disable row level security;
alter table org_members   disable row level security;

-- ── ADD org_id TO DATA TABLES ────────────────────────────
alter table jobs  add column if not exists org_id bigint references organizations(id) on delete cascade;
alter table teams add column if not exists org_id bigint references organizations(id) on delete cascade;

-- ── ENABLE RLS ON DATA TABLES ────────────────────────────
alter table jobs       enable row level security;
alter table teams      enable row level security;
alter table candidates enable row level security;
alter table employees  enable row level security;

-- ── DROP OLD PERMISSIVE POLICIES IF THEY EXIST ───────────
drop policy if exists "jobs_org"       on jobs;
drop policy if exists "teams_org"      on teams;
drop policy if exists "candidates_org" on candidates;
drop policy if exists "employees_org"  on employees;

-- ── RLS POLICIES ─────────────────────────────────────────

-- Jobs: full access for members of the owning org
create policy "jobs_org" on jobs for all
  using  (org_id in (select org_id from org_members where user_id = auth.uid()))
  with check (org_id in (select org_id from org_members where user_id = auth.uid()));

-- Teams: same
create policy "teams_org" on teams for all
  using  (org_id in (select org_id from org_members where user_id = auth.uid()))
  with check (org_id in (select org_id from org_members where user_id = auth.uid()));

-- Candidates: access via parent job's org
create policy "candidates_org" on candidates for all
  using (
    job_id in (
      select id from jobs
      where org_id in (select org_id from org_members where user_id = auth.uid())
    )
  )
  with check (
    job_id in (
      select id from jobs
      where org_id in (select org_id from org_members where user_id = auth.uid())
    )
  );

-- Employees: access via parent team's org
create policy "employees_org" on employees for all
  using (
    team_id in (
      select id from teams
      where org_id in (select org_id from org_members where user_id = auth.uid())
    )
  )
  with check (
    team_id in (
      select id from teams
      where org_id in (select org_id from org_members where user_id = auth.uid())
    )
  );

-- ── NOTE ─────────────────────────────────────────────────
-- After running this script, existing rows in jobs/teams
-- will have org_id = NULL and will be invisible until
-- reassigned. Run the app and a new org will be created
-- automatically on first login.
