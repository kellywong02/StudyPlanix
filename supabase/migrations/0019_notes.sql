create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  title text not null,
  content jsonb not null default '{"type":"doc","content":[]}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_id_idx on notes (user_id);
create index notes_course_id_idx on notes (course_id);

alter table notes enable row level security;

create policy "owner_all" on notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger set_notes_updated_at
  before update on notes
  for each row execute procedure public.set_updated_at();
