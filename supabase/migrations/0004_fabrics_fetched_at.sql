-- Phase 2: marker, či sme už pre dodávateľa skúšali AI extrakciu látok z webu.
-- Zabraňuje opakovanému spúšťaniu (a míňaniu API kreditu) pri každom publish / cron behu.

alter table suppliers add column if not exists fabrics_fetched_at timestamptz;

-- index na rýchle nájdenie publikovaných dodávateľov bez pokusu o extrakciu (pre cron backfill)
create index if not exists suppliers_fabrics_pending_idx
  on suppliers (status)
  where fabrics_fetched_at is null;
