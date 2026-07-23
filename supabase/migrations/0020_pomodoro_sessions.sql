create table pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  session_type text not null default 'focus' check (session_type in ('focus', 'short_break', 'long_break')),
  duration_minutes integer not null check (duration_minutes > 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index pomodoro_sessions_user_completed_idx on pomodoro_sessions (user_id, completed_at);

alter table pomodoro_sessions enable row level security;

create policy "owner_all" on pomodoro_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
