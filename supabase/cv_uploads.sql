create table cv_uploads (
  id bigint primary key generated always as identity,
  file_name text not null,
  file_path text not null,
  candidate_name text not null,
  job_id int,
  job_title text,
  uploaded_at timestamptz default now()
);

alter table cv_uploads enable row level security;
create policy "Service role kan alt" on cv_uploads
  for all to service_role using (true) with check (true);
