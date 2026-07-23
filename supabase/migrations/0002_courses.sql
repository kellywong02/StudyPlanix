create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  code text,
  color text,
  instructor text,
  location text,
  term text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_user_id_idx on courses (user_id);

alter table courses enable row level security;

create policy "owner_all" on courses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger set_courses_updated_at
  before update on courses
  for each row execute procedure public.set_updated_at();
