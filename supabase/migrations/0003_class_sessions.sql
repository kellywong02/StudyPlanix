-- one row = either a weekly-recurring class pattern OR a single dated event (exam/one-off)
create table class_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade, -- denormalized from courses.user_id for RLS
  course_id uuid not null references courses(id) on delete cascade,
  title text,
  session_type text not null default 'lecture'
    check (session_type in ('lecture','lab','tutorial','seminar','exam','other')),
  location text,
  is_recurring boolean not null default true,
  day_of_week smallint check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  specific_dates date[], -- one or more exact dates, used when is_recurring = false
  recurrence_start_date date,
  recurrence_end_date date,
  source text not null default 'manual'
    check (source in ('manual','ics_import','xlsx_import')),
  external_uid text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_fields_required check (
    (is_recurring = true
      and day_of_week is not null
      and recurrence_start_date is not null
      and recurrence_end_date is not null
      and specific_dates is null)
    or
    (is_recurring = false
      and specific_dates is not null
      and array_length(specific_dates, 1) > 0
      and day_of_week is null
      and recurrence_start_date is null
      and recurrence_end_date is null)
  ),
  constraint end_after_start check (end_time > start_time)
);

create index class_sessions_user_id_idx on class_sessions (user_id);
create index class_sessions_course_id_idx on class_sessions (course_id);
-- plain (non-partial) unique index: Postgres already treats NULL as distinct from
-- every other NULL in a standard unique index, so manual entries (external_uid
-- IS NULL) never collide — and this shape is required for ON CONFLICT upserts,
-- which can't target a partial index unless the query repeats its WHERE clause.
create unique index class_sessions_user_external_uid_idx
  on class_sessions (user_id, external_uid);

alter table class_sessions enable row level security;

create policy "owner_all" on class_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger set_class_sessions_updated_at
  before update on class_sessions
  for each row execute procedure public.set_updated_at();
