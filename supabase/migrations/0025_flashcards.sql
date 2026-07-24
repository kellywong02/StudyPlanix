create table flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  title text not null,
  source_filename text,
  created_at timestamptz not null default now()
);

create table flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references flashcard_decks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_index integer not null,
  front text not null,
  back text not null,
  box integer not null default 1 check (box between 1 and 3),
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz
);

create index flashcard_decks_user_id_idx on flashcard_decks (user_id);
create index flashcards_deck_id_idx on flashcards (deck_id, order_index);
create index flashcards_user_due_idx on flashcards (user_id, next_review_at);

alter table flashcard_decks enable row level security;
alter table flashcards enable row level security;

create policy "owner_all" on flashcard_decks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on flashcards for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
