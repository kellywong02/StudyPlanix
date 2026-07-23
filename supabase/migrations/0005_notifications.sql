-- doubles as the in-app notification feed and the email-send dedupe ledger
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in
    ('assignment_due_soon','assignment_overdue','exam_upcoming','class_starting_soon','system')),
  title text not null,
  body text,
  related_assignment_id uuid references assignments(id) on delete cascade,
  related_class_session_id uuid references class_sessions(id) on delete cascade,
  occurrence_date date, -- disambiguates which instance of a recurring class_session this is about
  is_read boolean not null default false,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  -- `nulls not distinct` so two rows with the same NULL related_class_session_id/occurrence_date
  -- (e.g. two assignment reminders) still collide on ON CONFLICT DO NOTHING as intended
  unique nulls not distinct (user_id, related_assignment_id, related_class_session_id, type, occurrence_date)
);

create index notifications_user_unread_idx on notifications (user_id, is_read);
create index notifications_emailed_at_idx on notifications (emailed_at);

alter table notifications enable row level security;

-- users can read/update (mark read) their own notifications, but never insert/delete directly —
-- only the service-role cron job writes rows
create policy "owner_select" on notifications for select
  using (auth.uid() = user_id);
create policy "owner_update" on notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
