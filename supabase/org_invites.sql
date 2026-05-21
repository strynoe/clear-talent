-- ── INVITE CODES PÅ ORGANISATIONS ───────────────────────
alter table organizations add column if not exists invite_code text unique;

-- Funktion til at generere læselige koder: XXXX-XXXX (8 tegn + bindestreg)
create or replace function gen_invite_code() returns text as $$
  select upper(
    substring(md5(random()::text || clock_timestamp()::text), 1, 4)
    || '-' ||
    substring(md5(random()::text || clock_timestamp()::text), 1, 4)
  );
$$ language sql;

-- Backfill eksisterende orgs med kode (kun dem uden kode)
update organizations set invite_code = gen_invite_code() where invite_code is null;

-- Fremtidige orgs får automatisk en kode
alter table organizations alter column invite_code set default gen_invite_code();
alter table organizations alter column invite_code set not null;

-- ── STATUS + EMAIL PÅ ORG_MEMBERS ───────────────────────
alter table org_members add column if not exists status text not null default 'active'
  check (status in ('pending', 'active'));

alter table org_members add column if not exists email text;

-- Eksisterende medlemskaber er aktive
update org_members set status = 'active' where status is null;

-- ── HJÆLPE-VIEW: pending members per org ─────────────────
-- (Bruges af medlems-API'en til at vise pending requests)
-- Ikke krav, bare for læsbarhed
