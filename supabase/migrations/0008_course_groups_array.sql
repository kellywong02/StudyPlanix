-- a student can be enrolled in more than one group for the same course
-- (e.g. a lecture group and a separate tutorial group), so this replaces the
-- single group_name text column with an array.
alter table courses drop column group_name;
alter table courses add column group_names text[] not null default '{}';
