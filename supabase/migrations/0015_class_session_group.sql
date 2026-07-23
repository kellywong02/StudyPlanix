-- links a class session to one of its course's groups (e.g. "Tutorial Group 3"),
-- so a student enrolled in multiple groups for the same course can tell which
-- group a given day's session belongs to
alter table class_sessions add column group_id uuid references course_groups(id) on delete set null;
