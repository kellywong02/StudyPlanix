-- allow a third import provenance value alongside manual/ics_import/xlsx_import
alter table class_sessions drop constraint class_sessions_source_check;
alter table class_sessions add constraint class_sessions_source_check
  check (source in ('manual', 'ics_import', 'xlsx_import', 'pdf_import'));
