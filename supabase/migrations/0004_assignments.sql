create table assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz not null,
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','done')),
  priority text check (priority in ('low','medium','high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assignments_user_due_idx on assignments (user_id, due_date);
create index assignments_course_id_idx on assignments (course_id);

alter table assignments enable row level security;

create policy "owner_all" on assignments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger set_assignments_updated_at
  before update on assignments
  for each row execute procedure public.set_updated_at();
