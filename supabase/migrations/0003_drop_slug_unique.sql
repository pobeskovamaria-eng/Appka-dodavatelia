-- Phase 1.5 fix: slug nemusí byť unique.
-- Viacero firiem môže mať rovnaký názov ("La Tessitura", "Tessuti SAS" atď.)
-- a tým aj rovnaký slug. Nedávame unikátnosť na úrovni DB, lebo dedup
-- robíme cez `website`. Pre URL routing frontend berie prvý záznam.

alter table suppliers drop constraint if exists suppliers_slug_key;
drop index if exists suppliers_slug_key;
create index if not exists suppliers_slug_idx on suppliers (slug);
