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
