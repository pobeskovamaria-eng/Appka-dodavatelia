# Databáza

Aktuálna schéma žije v `supabase/migrations/0001_init.sql`. Tento dokument je čítavá referencia.

## Tabuľky

### `suppliers` — dodávatelia / výrobcovia

| stĺpec        | typ         | poznámky                                                         |
| ------------- | ----------- | ---------------------------------------------------------------- |
| `id`          | uuid PK     | `gen_random_uuid()`                                              |
| `name`        | text NOT NULL | názov firmy ako prišiel zo zdroja (po `trim`)                  |
| `slug`        | text UNIQUE | `slugify(name)` — používaný v URL `/supplier/[slug]`             |
| `website`     | text        | **čistá doména**, napr. `mojlatka.sk` (bez `https://`, bez `www.`) — dedup kľúč |
| `email`       | text        |                                                                  |
| `phone`       | text        |                                                                  |
| `country`     | text        | **ISO 3166-1 alpha-2**: `SK`, `CZ`, `PL`                         |
| `city`        | text        |                                                                  |
| `description` | text        |                                                                  |
| `logo_url`    | text        | odkaz na Supabase Storage (zatiaľ nevyužívané)                   |
| `source`      | text        | `apify_gmaps` \| `apify_web` \| `manual`                         |
| `source_url`  | text        | URL pôvodného záznamu (napr. Google Maps place URL)              |
| `raw`         | jsonb       | celý originálny payload — pre audit a re-parse                   |
| `status`      | text        | `new` \| `published` \| `rejected` (CHECK constraint)            |
| `created_at`  | timestamptz |                                                                  |
| `updated_at`  | timestamptz | auto cez `set_updated_at()` trigger                              |

**Indexy:**
- `suppliers_status_country_idx (status, country)` — hlavný filter
- `suppliers_name_trgm_idx` — GIN cez `pg_trgm` pre fuzzy hľadanie v názve
- `suppliers_website_key` — UNIQUE *partial* index (`where website is not null`) → dedup

### `fabrics` — ponuka látok (1:N k `suppliers`)

| stĺpec           | typ         | poznámky                                       |
| ---------------- | ----------- | ---------------------------------------------- |
| `id`             | uuid PK     |                                                |
| `supplier_id`    | uuid FK     | ON DELETE CASCADE                              |
| `name`           | text        | názov kolekcie / produktu                      |
| `material_type`  | text[]      | kódy z `material_types` (`cotton`, `linen`…)   |
| `composition`    | text        | napr. `95% bavlna, 5% elastan`                 |
| `weight_gsm`     | int         | gramáž v g/m²                                  |
| `width_cm`       | int         |                                                |
| `moq`            | int         | minimálny odber                                |
| `moq_unit`       | text        | `m` \| `kg`                                    |
| `certifications` | text[]      | napr. `['OEKO-TEX','GOTS']`                    |
| `colors`         | text[]      |                                                |

**Indexy:**
- `fabrics_supplier_idx (supplier_id)`
- `fabrics_material_idx` — GIN cez `material_type` (pre `contains` filter)
- `fabrics_cert_idx` — GIN cez `certifications`

### `material_types` — číselník materiálov

Drží `code → label` mapping pre konzistentné filtre. Seed obsahuje: `cotton`, `linen`, `wool`, `silk`, `viscose`, `polyester`, `elastane`.

## RLS politiky

**`suppliers`:**
- `select` pre `anon, authenticated` ak `status = 'published'`.
- Pre `insert/update/delete` neexistuje politika → vykonáva sa len cez `service_role` v ingest endpointe a admin server actions (service_role obchádza RLS automaticky).

**`fabrics`:**
- `select` pre `anon, authenticated` ak existuje `suppliers s where s.id = fabrics.supplier_id AND s.status = 'published'`.

**`material_types`:**
- `select` pre všetkých.

## Migrácie

- Nové zmeny schémy: vytvor `supabase/migrations/000N_popisne_meno.sql`.
- **Nikdy needituj existujúcu migráciu**, ktorá je už aplikovaná v produkcii — vytvor novú s `alter table … add column …`.
- Lokálne: spusti SQL v Supabase SQL editore alebo cez `supabase db push` (vyžaduje Supabase CLI).

## Bežné dotazy

**Zoznam publikovaných dodávateľov podľa krajiny + materiálu:**
```sql
select s.*
from suppliers s
join fabrics f on f.supplier_id = s.id
where s.status = 'published'
  and s.country = 'SK'
  and f.material_type && array['cotton','linen']
group by s.id
order by s.name;
```

**Fronta na review:**
```sql
select id, name, website, country, source_url
from suppliers
where status = 'new'
order by created_at desc;
```

**Detekcia duplicit bez webu (manuálny merge):**
```sql
select lower(name), city, count(*) as n
from suppliers
where website is null
group by 1, 2
having count(*) > 1;
```
