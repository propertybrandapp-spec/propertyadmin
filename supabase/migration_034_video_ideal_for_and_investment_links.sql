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

-- 3. Ensure listing_field_options allows possession, land_use, and ideal_for
alter table public.listing_field_options drop constraint if exists listing_field_options_field_type_check;
alter table public.listing_field_options
  add constraint listing_field_options_field_type_check
  check (field_type in ('property_type', 'bhk', 'amenity', 'tag', 'budget_range', 'possession', 'land_use', 'ideal_for'));
