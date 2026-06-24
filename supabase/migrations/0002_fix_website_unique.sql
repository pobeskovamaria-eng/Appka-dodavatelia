-- Phase 1.5 fix: nahradiť partial unique index regulárnym UNIQUE constraintom.
-- Partial index `where website is not null` nefungoval ako ON CONFLICT target pri
-- Supabase upsert (PostgREST issue). Regular UNIQUE allowuje multiple NULLs (default
-- v Postgres je NULLs DISTINCT), takže funkčne sa nič nemení, len upsert už funguje.

drop index if exists suppliers_website_key;
alter table suppliers drop constraint if exists suppliers_website_key;
alter table suppliers add constraint suppliers_website_key unique (website);
