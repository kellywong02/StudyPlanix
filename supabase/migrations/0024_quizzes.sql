create table quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  title text not null,
  source_filename text,
  created_at timestamptz not null default now()
);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_index integer not null,
  question_type text not null check (question_type in ('mcq', 'true_false', 'short_answer')),
  question_text text not null,
  options jsonb,
  correct_answer text not null,
  explanation text
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null,
  total_questions integer not null,
  answers jsonb not null default '{}',
  completed_at timestamptz not null default now()
);

create index quizzes_user_id_idx on quizzes (user_id);
create index quiz_questions_quiz_id_idx on quiz_questions (quiz_id, order_index);
create index quiz_attempts_quiz_id_idx on quiz_attempts (quiz_id);
create index quiz_attempts_user_id_idx on quiz_attempts (user_id);

alter table quizzes enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_attempts enable row level security;

create policy "owner_all" on quizzes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on quiz_questions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on quiz_attempts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
