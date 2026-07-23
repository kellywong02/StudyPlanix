-- The original partial unique index (`where external_uid is not null`) can't be
-- targeted by `ON CONFLICT (user_id, external_uid)` — Postgres only matches a
-- partial index if the upsert also specifies the same WHERE predicate, which
-- Supabase's .upsert() onConflict option doesn't support. A plain unique index
-- gives the same practical behavior here: Postgres unique indexes already treat
-- NULL as distinct from every other NULL, so manual entries (external_uid IS NULL)
-- still never collide with each other.
drop index if exists class_sessions_user_external_uid_idx;
create unique index class_sessions_user_external_uid_idx
  on class_sessions (user_id, external_uid);
