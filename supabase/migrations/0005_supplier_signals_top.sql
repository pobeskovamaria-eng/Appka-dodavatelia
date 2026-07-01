-- Phase 2: nové signály na filtrovanie a manuálne označenie "top" dodávateľov.
--   is_top             — admin ručne označí dodávateľa, ktorý spĺňa všetky naše požiadavky
--   sustainability     — na webe je zmienená udržateľnosť (eco / organic / recycled / responsible…)
--   site_certifications— certifikácie nájdené priamo na webe (OEKO-TEX, GOTS, GRS…), site-level
--   signals_scanned_at — marker, či sme už web skenovali na sustainability/certifikácie (gate pre backfill)

alter table suppliers add column if not exists is_top boolean not null default false;
alter table suppliers add column if not exists sustainability boolean not null default false;
alter table suppliers add column if not exists site_certifications text[] not null default '{}';
alter table suppliers add column if not exists signals_scanned_at timestamptz;

-- index na rýchle nájdenie dodávateľov s webom, ktorých sme ešte neskenovali (pre backfill signálov)
create index if not exists suppliers_signals_pending_idx
  on suppliers (signals_scanned_at)
  where signals_scanned_at is null;

-- index na filtrovanie top dodávateľov
create index if not exists suppliers_is_top_idx
  on suppliers (is_top)
  where is_top = true;
