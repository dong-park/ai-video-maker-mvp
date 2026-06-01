-- AI Video Maker MVP — 초기 스키마 (ARCHITECTURE.md 3절 단일 진실원)
-- Postgres / Supabase 대상. 로컬/테스트는 src/server/db 의 in-memory 폴백을 사용한다.

create table if not exists users (
  id text primary key,
  email text,
  created_at timestamptz default now()
);

create table if not exists media_assets (
  id text primary key,
  user_id text,
  job_id text,
  type text not null,
  original_filename text,
  mime_type text,
  storage_url text not null,
  width integer,
  height integer,
  duration_seconds numeric,
  file_size_bytes bigint,
  sort_order integer default 0,
  selected boolean default true,
  metadata_json jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists video_jobs (
  id text primary key,
  user_id text,
  input_type text not null,
  status text not null,
  style text not null,
  aspect_ratio text not null,
  duration_seconds integer not null,
  provider text,
  provider_model text,
  provider_job_id text,
  prompt text,
  negative_prompt text,
  progress integer default 0,
  error_code text,
  error_message text,
  cost_estimate_usd numeric,
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists generated_outputs (
  id text primary key,
  job_id text not null,
  video_url text not null,
  thumbnail_url text,
  provider_output_url text,
  width integer,
  height integer,
  duration_seconds numeric,
  file_size_bytes bigint,
  created_at timestamptz default now()
);

create table if not exists provider_events (
  id text primary key,
  provider text not null,
  provider_job_id text,
  event_type text,
  payload_json jsonb not null,
  received_at timestamptz default now(),
  processed_at timestamptz
);

create index if not exists idx_media_assets_job_id on media_assets (job_id);
create index if not exists idx_video_jobs_provider_job_id on video_jobs (provider_job_id);
create index if not exists idx_generated_outputs_job_id on generated_outputs (job_id);
create index if not exists idx_provider_events_provider_job_id on provider_events (provider_job_id);
