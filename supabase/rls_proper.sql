-- ════════════════════════════════════════════════════════════
-- ORDENTLIG RLS-OPSÆTNING FOR PRODUKTION
-- ════════════════════════════════════════════════════════════
-- Hver bruger kan kun se data fra sin egen organisation.
-- Service role key bruges af /api/* routes og omgår alle policies.
-- ════════════════════════════════════════════════════════════

-- ── TÆND RLS PÅ ALLE DATA-TABELLER ──────────────────────
alter table jobs       enable row level security;
alter table teams      enable row level security;
alter table candidates enable row level security;
alter table employees  enable row level security;

-- ── SLET GAMLE POLICIES (clean slate) ───────────────────
drop policy if exists "jobs_org"             on jobs;
drop policy if exists "jobs_org_select"      on jobs;
drop policy if exists "jobs_org_insert"      on jobs;
drop policy if exists "jobs_org_update"      on jobs;
drop policy if exists "jobs_org_delete"      on jobs;

drop policy if exists "teams_org"            on teams;
drop policy if exists "teams_org_select"     on teams;
drop policy if exists "teams_org_insert"     on teams;
drop policy if exists "teams_org_update"     on teams;
drop policy if exists "teams_org_delete"     on teams;

drop policy if exists "candidates_org"       on candidates;
drop policy if exists "candidates_org_select" on candidates;
drop policy if exists "candidates_org_insert" on candidates;
drop policy if exists "candidates_org_update" on candidates;
drop policy if exists "candidates_org_delete" on candidates;

drop policy if exists "employees_org"        on employees;
drop policy if exists "employees_org_select" on employees;
drop policy if exists "employees_org_insert" on employees;
drop policy if exists "employees_org_update" on employees;
drop policy if exists "employees_org_delete" on employees;

-- ── HJÆLPE-FUNKTION: brugerens aktive orgs ──────────────
-- Returnerer alle orgs hvor brugeren er aktivt medlem
create or replace function user_orgs() returns setof bigint
language sql security definer stable
as $$
  select org_id from org_members
  where user_id = auth.uid() and status = 'active'
$$;

-- ── JOBS — kun samme org ────────────────────────────────
create policy "jobs_select" on jobs for select
  using (org_id in (select user_orgs()));
create policy "jobs_insert" on jobs for insert
  with check (org_id in (select user_orgs()));
create policy "jobs_update" on jobs for update
  using (org_id in (select user_orgs()))
  with check (org_id in (select user_orgs()));
create policy "jobs_delete" on jobs for delete
  using (org_id in (select user_orgs()));

-- ── TEAMS — kun samme org ───────────────────────────────
create policy "teams_select" on teams for select
  using (org_id in (select user_orgs()));
create policy "teams_insert" on teams for insert
  with check (org_id in (select user_orgs()));
create policy "teams_update" on teams for update
  using (org_id in (select user_orgs()))
  with check (org_id in (select user_orgs()));
create policy "teams_delete" on teams for delete
  using (org_id in (select user_orgs()));

-- ── CANDIDATES — via parent jobs org ────────────────────
create policy "candidates_select" on candidates for select
  using (job_id in (select id from jobs where org_id in (select user_orgs())));
create policy "candidates_insert" on candidates for insert
  with check (job_id in (select id from jobs where org_id in (select user_orgs())));
create policy "candidates_update" on candidates for update
  using (job_id in (select id from jobs where org_id in (select user_orgs())))
  with check (job_id in (select id from jobs where org_id in (select user_orgs())));
create policy "candidates_delete" on candidates for delete
  using (job_id in (select id from jobs where org_id in (select user_orgs())));

-- ── EMPLOYEES — via parent teams org ────────────────────
create policy "employees_select" on employees for select
  using (team_id in (select id from teams where org_id in (select user_orgs())));
create policy "employees_insert" on employees for insert
  with check (team_id in (select id from teams where org_id in (select user_orgs())));
create policy "employees_update" on employees for update
  using (team_id in (select id from teams where org_id in (select user_orgs())))
  with check (team_id in (select id from teams where org_id in (select user_orgs())));
create policy "employees_delete" on employees for delete
  using (team_id in (select id from teams where org_id in (select user_orgs())));

-- ── CV_UPLOADS hvis tabellen findes (CV-fil-tracking) ────
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'cv_uploads') then
    execute 'alter table cv_uploads enable row level security';
    execute 'drop policy if exists "cv_uploads_org" on cv_uploads';
    execute 'create policy "cv_uploads_org" on cv_uploads for all
      using (job_id in (select id from jobs where org_id in (select user_orgs())))
      with check (job_id in (select id from jobs where org_id in (select user_orgs())))';
  end if;
end$$;

-- ── METADATA-TABELLER FORBLIVER ÅBNE ────────────────────
-- organizations, org_members og invite_links har ikke RLS:
-- - organizations/org_members: kun læses via /api/org (service role)
-- - invite_links: UUID-token er adgangskontrollen i sig selv
alter table organizations disable row level security;
alter table org_members   disable row level security;
alter table invite_links  disable row level security;

-- ════════════════════════════════════════════════════════════
-- TEST: log ind som forskellige brugere og bekræft de KUN ser
-- deres egen orgs data. Service role omgår alt for /api/* routes.
-- ════════════════════════════════════════════════════════════
