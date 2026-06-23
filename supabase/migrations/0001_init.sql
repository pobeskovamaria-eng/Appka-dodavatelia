-- Phase 1: schéma pre katalóg dodávateľov textilu
-- Spusti v Supabase SQL editore alebo cez `supabase db push`.

create extension if not exists pg_trgm;

-- =========================================================
-- SUPPLIERS
-- =========================================================
create table if not exists suppliers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique,
  website     text,                          -- normalizovaná doména, dedup kľúč
  email       text,
  phone       text,
  country     text,                          -- ISO 3166-1 alpha-2: 'SK','CZ','PL'
  city        text,
  description text,
  logo_url    text,
  source      text,                          -- 'apify_gmaps' | 'apify_web' | 'manual'
  source_url  text,
  raw         jsonb,                         -- originál payload (audit / re-parse)
  status      text not null default 'new'    -- 'new' | 'published' | 'rejected'
              check (status in ('new','published','rejected')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists suppliers_status_country_idx on suppliers (status, country);
create index if not exists suppliers_name_trgm_idx on suppliers using gin (name gin_trgm_ops);
create unique index if not exists suppliers_website_key on suppliers (website) where website is not null;

-- =========================================================
-- FABRICS (1 dodávateľ → N látok)
-- =========================================================
create table if not exists fabrics (
  id             uuid primary key default gen_random_uuid(),
  supplier_id    uuid not null references suppliers(id) on delete cascade,
  name           text,
  material_type  text[] not null default '{}',  -- ['bavlna'], ['ľan','viskóza']
  composition    text,
  weight_gsm     int,
  width_cm       int,
  moq            int,
  moq_unit       text check (moq_unit in ('m','kg') or moq_unit is null),
  certifications text[] not null default '{}',  -- ['OEKO-TEX','GOTS']
  colors         text[] not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists fabrics_supplier_idx on fabrics (supplier_id);
create index if not exists fabrics_material_idx on fabrics using gin (material_type);
create index if not exists fabrics_cert_idx on fabrics using gin (certifications);

-- =========================================================
-- ČÍSELNÍK MATERIÁLOV (konzistentné filtre)
-- =========================================================
create table if not exists material_types (
  code  text primary key,
  label text not null
);

insert into material_types (code, label) values
  ('cotton',    'Bavlna'),
  ('linen',     'Ľan'),
  ('wool',      'Vlna'),
  ('silk',      'Hodváb'),
  ('viscose',   'Viskóza'),
  ('polyester', 'Polyester'),
  ('elastane',  'Elastan')
on conflict (code) do nothing;

-- =========================================================
-- updated_at trigger
-- =========================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists suppliers_set_updated_at on suppliers;
create trigger suppliers_set_updated_at
  before update on suppliers
  for each row execute function set_updated_at();

-- =========================================================
-- RLS — verejnosť vidí len published, admin (service_role) všetko
-- =========================================================
alter table suppliers     enable row level security;
alter table fabrics       enable row level security;
alter table material_types enable row level security;

drop policy if exists "public reads published suppliers" on suppliers;
create policy "public reads published suppliers"
  on suppliers for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "public reads fabrics of published suppliers" on fabrics;
create policy "public reads fabrics of published suppliers"
  on fabrics for select
  to anon, authenticated
  using (exists (
    select 1 from suppliers s
    where s.id = fabrics.supplier_id and s.status = 'published'
  ));

drop policy if exists "public reads material types" on material_types;
create policy "public reads material types"
  on material_types for select
  to anon, authenticated
  using (true);

-- service_role obchádza RLS automaticky — netreba politiky pre admin/ingest.
