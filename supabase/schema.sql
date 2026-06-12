-- StarTwin — Supabase schema (real-data, universal edition)
-- Run in Supabase SQL Editor. Bulk-populate with scripts/ingest.mjs output.

create type gender_t as enum ('male', 'female', 'other');

create table public.celebrities (
  id         text primary key,                               -- Wikidata QID (e.g. 'Q317521')
  name_en    text     not null,
  name_tr    text     not null,
  gender     gender_t not null,
  birth_date date     not null,
  sun_sign   text     not null,                              -- derived from birth_date at ingest
  height     smallint check (height between 120 and 250),    -- cm, often unknown
  weight     smallint check (weight between 30 and 300),     -- kg, often unknown
  fields     text[]   not null default '{}',                 -- acting|music|film|art|writing|science|sports|business|politics|other
  image_url  text,
  fame       int      not null default 0,                    -- wiki sitelink count (popularity)
  turkish    boolean  not null default false,
  moon_sign  text,                                           -- optional bonus signal
  mbti_type  char(4),                                        -- optional bonus signal
  created_at timestamptz not null default now()
);

create index celebrities_fields_idx on public.celebrities using gin (fields);
create index celebrities_sun_idx    on public.celebrities (sun_sign);
create index celebrities_fame_idx   on public.celebrities (fame desc);

-- Public read-only (viral app, browse without auth).
alter table public.celebrities enable row level security;

create policy "celebrities_public_read"
  on public.celebrities for select
  to anon, authenticated
  using (true);

-- Example rows (shape reference). Real data is bulk-loaded from Wikidata:
--   node scripts/ingest.mjs emit 80 250 4   →  curl batches  →  build  →  src/data/celebrities.json
-- then upsert that JSON via the Supabase JS client or a generated COPY/INSERT.
insert into public.celebrities (id, name_en, name_tr, gender, birth_date, sun_sign, height, fields, image_url, fame, turkish) values
  ('Q76',     'Barack Obama',   'Barack Obama',   'male',   '1961-08-04', 'Leo',   185, '{politics}',
   'https://commons.wikimedia.org/wiki/Special:FilePath/President%20Barack%20Obama.jpg', 398, false),
  ('Q937',    'Albert Einstein','Albert Einstein','male',   '1879-03-14', 'Pisces', NULL, '{science,writing}',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Einstein%201921%20by%20F%20Schmutzer%20-%20restoration.jpg', 320, false),
  ('Q32522',  'Malala Yousafzai','Malala Yusufzai','female','1997-07-12', 'Cancer', NULL, '{writing}',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Malala%20Yousafzai%20at%20Girl%20Summit%202014.jpg', 180, false)
on conflict (id) do nothing;
