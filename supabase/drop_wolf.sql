-- Sletter alle spor af det gamle 8-type-system fra databasen
-- Kør ÉN gang i Supabase SQL Editor

alter table candidates
  drop column if exists wolf,
  drop column if exists wolf_sec,
  drop column if exists wolf_reasoning;

alter table employees
  drop column if exists wolf,
  drop column if exists wolf_sec,
  drop column if exists wolf_reasoning;

alter table jobs
  drop column if exists wolf1,
  drop column if exists wolf2;
