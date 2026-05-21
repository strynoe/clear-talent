-- MBTI + Enneagram typology felter

alter table candidates
  add column if not exists mbti                 text not null default '',
  add column if not exists enneagram            text not null default '',
  add column if not exists typology_summary     text not null default '',
  add column if not exists detailed_explanation text not null default '',
  add column if not exists typology_strengths   jsonb not null default '[]',
  add column if not exists typology_weaknesses  jsonb not null default '[]',
  add column if not exists collab_strengths     jsonb not null default '[]',
  add column if not exists collab_risks         jsonb not null default '[]';

alter table employees
  add column if not exists mbti                 text not null default '',
  add column if not exists enneagram            text not null default '',
  add column if not exists typology_summary     text not null default '',
  add column if not exists detailed_explanation text not null default '',
  add column if not exists typology_strengths   jsonb not null default '[]',
  add column if not exists typology_weaknesses  jsonb not null default '[]',
  add column if not exists collab_strengths     jsonb not null default '[]',
  add column if not exists collab_risks         jsonb not null default '[]';
