-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 034 — Location Video, Ideal For & Investment Corridor Links
-- Safe to run more than once. Run in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Location Video URL, Ideal For & Investment Corridor on Listings
alter table public.listings add column if not exists location_video_url text;
alter table public.listings add column if not exists ideal_for text[] default '{}';
alter table public.listings add column if not exists investment_corridor text;

-- 2. Linked Listings on Investment Opportunities (Corridors)
alter table public.investment_opportunities add column if not exists linked_listing_ids jsonb default '[]';

-- 3. Expand listing_field_options check constraint to allow possession, land_use, ideal_for
alter table public.listing_field_options drop constraint if exists listing_field_options_field_type_check;
alter table public.listing_field_options
  add constraint listing_field_options_field_type_check
  check (field_type in ('property_type', 'bhk', 'amenity', 'tag', 'budget_range', 'possession', 'land_use', 'ideal_for'));

-- 4. Default options for Possession in listing_field_options (if not already present)
insert into public.listing_field_options (field_type, value, display_order)
select 'possession', v.value, v.ord
from (values
  ('Ready to Move', 1),
  ('Under Construction', 2),
  ('New Launch', 3)
) as v(value, ord)
where not exists (
  select 1 from public.listing_field_options o
  where o.field_type = 'possession' and o.value = v.value
);

-- 5. Default options for Land Use in listing_field_options (if not already present)
insert into public.listing_field_options (field_type, value, display_order)
select 'land_use', v.value, v.ord
from (values
  ('Residential', 1),
  ('Commercial', 2),
  ('Industrial', 3),
  ('Agricultural', 4),
  ('Mixed Use', 5),
  ('Institutional', 6)
) as v(value, ord)
where not exists (
  select 1 from public.listing_field_options o
  where o.field_type = 'land_use' and o.value = v.value
);
