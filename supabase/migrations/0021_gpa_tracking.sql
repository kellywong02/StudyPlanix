-- final grade + credit weight for a completed course, used by the GPA tracker
alter table courses add column credits numeric check (credits > 0);
alter table courses add column grade text;

-- which grading scale to interpret each course's grade against
alter table profiles add column grading_scale_id text not null default 'us_4_0';
alter table profiles add column custom_grade_scale jsonb;
