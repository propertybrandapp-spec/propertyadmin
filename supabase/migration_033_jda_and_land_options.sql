-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 033 — Joint Development (JDA), Land Use & Verification Fields
-- Safe to run more than once. Run in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. JDA & Land Verification Fields on Listings
alter table public.listings add column if not exists open_for_jda          boolean not null default false;
alter table public.listings add column if not exists jda_terms             text;
alter table public.listings add column if not exists title_verified        boolean not null default false;
alter table public.listings add column if not exists zoning_conversion_done boolean not null default false;

-- 2. Expand field_type check constraint on listing_field_options to allow 'possession' and 'land_use'
alter table public.listing_field_options drop constraint if exists listing_field_options_field_type_check;
alter table public.listing_field_options
  add constraint listing_field_options_field_type_check
  check (field_type in ('property_type', 'bhk', 'amenity', 'tag', 'budget_range', 'possession', 'land_use', 'ideal_for'));

-- 3. Populate default options for Possession & Land Use in listing_field_options
-- so admins can view, customize, and add custom entries in Site Content -> Listing Options.
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

