-- profiles previously only allowed insert via the security-definer signup
-- trigger; the study-preferences upsert needs owners to be able to insert
-- their own row directly too (e.g. recovering a profile that was deleted).
create policy "owner_insert" on profiles for insert
  with check (auth.uid() = id);
