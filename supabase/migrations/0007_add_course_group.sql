-- named group_names (plural, array) since a student can be enrolled in more than
-- one group for the same course (e.g. lecture group + tutorial group), and GROUP
-- is a reserved SQL keyword
alter table courses add column group_names text[] not null default '{}';
