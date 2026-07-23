-- instructors now vary per group rather than per course, and groups need more
-- structure than a plain string array, so this replaces both the course-level
-- instructor column and the group_names array with a proper table.
alter table courses drop column instructor;
alter table courses drop column group_names;

create table course_groups (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, -- denormalized for RLS
  name text not null,
  instructor text,
  instructor_email text,
  created_at timestamptz not null default now()
);

create index course_groups_course_id_idx on course_groups (course_id);

alter table course_groups enable row level security;

create policy "owner_all" on course_groups for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
