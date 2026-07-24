-- grading scale ids were expanded from 4 generic buckets (e.g. 'us_4_0') to
-- per-institution presets matching real published grading policies (e.g.
-- 'us-standard', 'nus', 'smu' — Singapore unis are 5.0 scale but SMU is
-- actually 4.0, which the old bucket scheme got wrong)
update profiles set grading_scale_id = 'us-standard' where grading_scale_id = 'us_4_0';

alter table profiles alter column grading_scale_id set default 'us-standard';
