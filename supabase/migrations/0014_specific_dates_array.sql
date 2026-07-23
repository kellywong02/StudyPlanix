-- generalizes the "single one-off date" case into "one or more specific dates",
-- so a non-recurring class (irregular/scattered schedule) can list multiple
-- exact calendar dates instead of just one.
--
-- Written to be safe both against the already-migrated live database (which
-- still has the old `specific_date` column at the time this was authored) and
-- against a fresh clone (where migration 0003 already creates the new
-- `specific_dates` shape directly, so there's nothing left for this one to do).

alter table class_sessions drop constraint if exists recurring_fields_required;
alter table class_sessions add column if not exists specific_dates date[];

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'class_sessions' and column_name = 'specific_date'
  ) then
    execute 'update class_sessions set specific_dates = array[specific_date] where specific_date is not null';
    execute 'alter table class_sessions drop column specific_date';
  end if;
end $$;

alter table class_sessions add constraint recurring_fields_required check (
  (is_recurring = true
    and day_of_week is not null
    and recurrence_start_date is not null
    and recurrence_end_date is not null
    and specific_dates is null)
  or
  (is_recurring = false
    and specific_dates is not null
    and array_length(specific_dates, 1) > 0
    and day_of_week is null
    and recurrence_start_date is null
    and recurrence_end_date is null)
);
