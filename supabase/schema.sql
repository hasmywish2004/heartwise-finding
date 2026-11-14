-- Genome Intelligence for Heart Health — full database schema
-- Supabase / PostgreSQL
--
-- Run this against a fresh Supabase project to recreate the database.
-- Order matters: tables, then indexes, then the confirmation trigger,
-- then row-level security, then the frozen panel seed.
--
-- Design notes worth knowing before you read:
--   * Every table is owned by a user through uploads.user_id. RLS walks
--     that chain; there is no "public" data except the panel itself.
--   * uploads.path is the routing decision: A = raw DNA file,
--     B = lab report (needs human confirmation), R = refused at intake.
--   * findings.label is constrained to the four honest outcomes. A fifth
--     label would need a migration, which is the point.
--   * n8n connects with the service_role key and bypasses RLS. The browser
--     connects with the publishable key and does not.

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- The fixed panel. Chosen and frozen BEFORE any file was analysed, so the
-- scope cannot be quietly widened to fit a nice-looking result.
create table if not exists panel_variants (
  id            uuid primary key default gen_random_uuid(),
  gene          text not null,
  rsid          text,
  chrom         text not null,
  pos           integer not null,
  ref           text not null,
  alt           text not null,
  genome_build  text not null default 'GRCh37',
  why_in_panel  text not null,
  frozen_at     timestamptz not null default now(),
  constraint panel_variants_locus_key unique (chrom, pos, ref, alt, genome_build)
);

-- One uploaded file.
create table if not exists uploads (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  filename       text not null,
  storage_path   text not null,
  detected_type  text not null default 'unknown'
                 check (detected_type in ('genotype_text','vcf','pdf','image','zip','gzip','unknown')),
  path           char(1) not null default 'A'
                 check (path in ('A','B','R')),
  status         text not null default 'received'
                 check (status in ('received','processing','awaiting_confirmation','done','refused')),
  refusal_reason text,
  created_at     timestamptz not null default now()
);

-- What was actually read out of the file, before any lookup.
-- user_confirmed is the gate: nothing downstream runs until it is true.
create table if not exists observations (
  id                 uuid primary key default gen_random_uuid(),
  upload_id          uuid not null references uploads(id) on delete cascade,
  source             text not null check (source in ('dna_file','lab_report')),
  gene               text,
  rsid               text,
  genome_build       text,
  chrom              text,
  pos                integer,
  ref                text,
  alt                text,
  genotype           text,
  panel_variant_id   uuid references panel_variants(id),
  hgvs_c             text,
  hgvs_p             text,
  zygosity           text,
  lab_classification text,
  user_confirmed     boolean not null default false,
  created_at         timestamptz not null default now()
);

-- Cached ClinVar / gnomAD evidence, keyed by variant. Lets a stale answer
-- stand in when a live lookup fails, rather than guessing.
create table if not exists evidence (
  id               uuid primary key default gen_random_uuid(),
  variant_key      text not null,
  source           text not null,
  classification   text,
  submitter_count  integer,
  is_conflicting   boolean,
  last_evaluated   date,
  review_status    text,
  conditions       text,
  population       text,
  south_asian_data boolean,
  source_url       text,
  raw              jsonb,
  fetched_at       timestamptz not null default now()
);

-- A finished card shown to the user.
create table if not exists findings (
  id                      uuid primary key default gen_random_uuid(),
  upload_id               uuid not null references uploads(id) on delete cascade,
  observation_id          uuid references observations(id) on delete cascade,
  label                   text not null
                          check (label in ('strong','contested','weak','refused')),
  headline                text not null,
  supports                text,
  disputes                text,
  evidence_age            text,
  population              text,
  source_urls             jsonb,
  rule_trace              text,
  lookup_status           text
                          check (lookup_status in ('ok','from_cache','failed','skipped','no_match')),
  sort_order              integer not null default 0,
  -- recheck fields: a finding is not a permanent snapshot
  variant_key             text,
  gene                    text,
  rsid                    text,
  classification          text,
  checked_at              timestamptz default now(),
  is_stale                boolean not null default false,
  previous_classification text,
  created_at              timestamptz not null default now()
);

-- The measurement. Every time a user says "I don't believe this".
create table if not exists rejections (
  id         uuid primary key default gen_random_uuid(),
  finding_id uuid not null references findings(id) on delete cascade,
  reason     text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------

create index if not exists uploads_user_id_idx            on uploads (user_id);
create index if not exists observations_upload_id_idx     on observations (upload_id);
create index if not exists observations_panel_variant_id_idx on observations (panel_variant_id);
create index if not exists evidence_variant_key_idx       on evidence (variant_key);
create index if not exists findings_upload_id_idx         on findings (upload_id);
create index if not exists findings_observation_id_idx    on findings (observation_id);
create index if not exists findings_variant_key_idx       on findings (variant_key) where variant_key is not null;
create index if not exists rejections_finding_id_idx      on rejections (finding_id);

-- ---------------------------------------------------------------------
-- 3. Confirmation trigger
-- ---------------------------------------------------------------------
-- When the user confirms the extraction, the upload must leave
-- 'awaiting_confirmation' in the SAME transaction. Doing this in the
-- frontend instead left the app bouncing the user back to the confirm
-- screen forever.

create or replace function mark_upload_processing_on_confirm()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.user_confirmed is true and (old.user_confirmed is distinct from new.user_confirmed) then
    update uploads set status = 'processing'
     where id = new.upload_id and status = 'awaiting_confirmation';
  end if;
  return new;
end;
$$;

drop trigger if exists observations_confirm_marks_processing on observations;
create trigger observations_confirm_marks_processing
after update on observations
for each row execute function mark_upload_processing_on_confirm();

-- ---------------------------------------------------------------------
-- 4. Row-level security
-- ---------------------------------------------------------------------
-- A genome is about as personal as data gets. Every policy below resolves
-- ownership back to uploads.user_id = auth.uid(). The panel is the only
-- table anyone may read freely, because it contains no user data.

alter table uploads        enable row level security;
alter table observations   enable row level security;
alter table findings       enable row level security;
alter table rejections     enable row level security;
alter table evidence       enable row level security;
alter table panel_variants enable row level security;

-- uploads: owned directly
create policy own_uploads_select on uploads for select to authenticated
  using (user_id = auth.uid());
create policy own_uploads_insert on uploads for insert to authenticated
  with check (user_id = auth.uid());
create policy own_uploads_update on uploads for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_uploads_delete on uploads for delete to authenticated
  using (user_id = auth.uid());

-- observations: owned through the upload. insert/update/delete exist so the
-- user can correct or remove a row the AI misread on the confirm screen.
create policy own_obs_select on observations for select to authenticated
  using (exists (select 1 from uploads u where u.id = observations.upload_id and u.user_id = auth.uid()));
create policy own_obs_insert on observations for insert to authenticated
  with check (exists (select 1 from uploads u where u.id = observations.upload_id and u.user_id = auth.uid()));
create policy own_obs_update on observations for update to authenticated
  using (exists (select 1 from uploads u where u.id = observations.upload_id and u.user_id = auth.uid()))
  with check (exists (select 1 from uploads u where u.id = observations.upload_id and u.user_id = auth.uid()));
create policy own_obs_delete on observations for delete to authenticated
  using (exists (select 1 from uploads u where u.id = observations.upload_id and u.user_id = auth.uid()));

-- findings: read-only to the browser. Only n8n (service_role) writes them.
create policy own_findings_select on findings for select to authenticated
  using (exists (select 1 from uploads u where u.id = findings.upload_id and u.user_id = auth.uid()));

-- rejections: the user may record and read their own challenges.
create policy own_rejections_select on rejections for select to authenticated
  using (exists (select 1 from findings f join uploads u on u.id = f.upload_id
                 where f.id = rejections.finding_id and u.user_id = auth.uid()));
create policy own_rejections_insert on rejections for insert to authenticated
  with check (exists (select 1 from findings f join uploads u on u.id = f.upload_id
                      where f.id = rejections.finding_id and u.user_id = auth.uid()));

-- evidence: cached public database records, not user data.
create policy evidence_is_readable on evidence for select to authenticated
  using (true);

-- panel: deliberately public. Anyone may audit what this tool looks at.
create policy panel_is_public on panel_variants for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------
-- 5. Storage
-- ---------------------------------------------------------------------
-- Private bucket. Files live under a folder named for the user's uid, and
-- the policies enforce that a user can only touch their own folder.

insert into storage.buckets (id, name, public)
values ('dna-uploads', 'dna-uploads', false)
on conflict (id) do nothing;

create policy dna_own_folder_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'dna-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy dna_own_folder_select on storage.objects for select to authenticated
  using (bucket_id = 'dna-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 6. Panel seed
-- ---------------------------------------------------------------------
-- The frozen scope. why_in_panel is part of the record on purpose: each
-- variant has to justify its presence, including the one chosen to fail.

insert into panel_variants (gene, rsid, chrom, pos, ref, alt, genome_build, why_in_panel) values
  ('APOE', 'rs429358', '19', 45411941, 'T', 'C', 'GRCh37',
   'With rs7412, defines the APOE e2/e3/e4 genotype. Among the most replicated findings in lipid and cardiovascular genetics. Expected label: strong.'),
  ('APOE', 'rs7412', '19', 45412079, 'C', 'T', 'GRCh37',
   'With rs429358, defines the APOE e2/e3/e4 genotype.'),
  ('LDLR', 'rs6511720', '19', 11202306, 'G', 'T', 'GRCh37',
   'Regulatory variant reported to associate with lower LDL-C. Included deliberately as a WEAK case: published sources disagree on which allele is protective, and no South Asian cohort was identified.')
on conflict (chrom, pos, ref, alt, genome_build) do nothing;

-- Note on MYBPC3: the 25bp deletion common in South Asians is NOT in this
-- table, and cannot be. It is a 25-base-pair deletion on chromosome 11;
-- consumer genotyping arrays do not report that class of variant at all.
-- It is handled as a standing refusal card in the analysis workflow, so the
-- tool states plainly that it cannot check the one variant a South Asian
-- user would most want checked.
