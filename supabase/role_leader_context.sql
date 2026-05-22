-- Tilføj lederkontekst til teams
alter table teams
  add column if not exists manager_mbti      text not null default '',
  add column if not exists manager_enneagram text not null default '',
  add column if not exists leadership_style  text not null default '';

-- Tilføj rollekontekst til jobs (description findes allerede)
alter table jobs
  add column if not exists hard_skills      text not null default '',
  add column if not exists success_criteria text not null default '',
  add column if not exists experience_level text not null default '';

-- Tilføj rollefit + lederfit til candidates og employees
alter table candidates
  add column if not exists role_fit_score     int,
  add column if not exists role_fit_reasoning text not null default '',
  add column if not exists leader_fit         text not null default '';

alter table employees
  add column if not exists role_fit_score     int,
  add column if not exists role_fit_reasoning text not null default '',
  add column if not exists leader_fit         text not null default '';
