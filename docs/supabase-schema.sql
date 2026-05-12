create table if not exists public.signd_records (
  scope text not null,
  id text not null,
  ts bigint,
  record jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (scope, id)
);

create index if not exists signd_records_scope_ts_idx
  on public.signd_records (scope, ts desc);

alter table public.signd_records enable row level security;

comment on table public.signd_records is
  'Signd scanner persistence. Access from backend only with SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.';
