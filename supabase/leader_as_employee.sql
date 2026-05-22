-- Leder er nu en medarbejder med role='leader'
alter table employees
  add column if not exists role             text not null default 'member' check (role in ('member', 'leader')),
  add column if not exists leadership_style text not null default '';

-- Fjern team-level leder-felter (de er ubrugte nu)
alter table teams
  drop column if exists manager_mbti,
  drop column if exists manager_enneagram,
  drop column if exists leadership_style;
