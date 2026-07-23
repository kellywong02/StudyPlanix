-- study preferences drive how the AI study planner paces work around a
-- student's other commitments (full-time job, part-time course load, etc.)
alter table profiles add column study_type text not null default 'full_time'
  check (study_type in ('full_time', 'part_time', 'part_time_job', 'full_time_job'));
alter table profiles add column study_availability text;

create table study_plan_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  assignment_id uuid references assignments(id) on delete cascade,
  title text not null,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  notes text,
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index study_plan_sessions_user_date_idx on study_plan_sessions (user_id, session_date);

alter table study_plan_sessions enable row level security;

create policy "owner_all" on study_plan_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger set_study_plan_sessions_updated_at
  before update on study_plan_sessions
  for each row execute procedure public.set_updated_at();
