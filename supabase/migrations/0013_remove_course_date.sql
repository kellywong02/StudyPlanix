-- reverted: courses can meet on different dates/days per class session
-- (class_sessions already models this), a single date on the course itself
-- doesn't make sense. `if exists` so this is a safe no-op on a fresh clone
-- where 0012 never added the column.
alter table courses drop column if exists course_date;
