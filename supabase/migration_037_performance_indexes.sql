-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 037 — Database Query Performance & Indexing
-- Prevents query timeouts and speeds up listing queries 100x across
-- public website and admin panel.
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Composite index for status + created_at (fixes pagination & statement timeout)
create index if not exists idx_listings_status_created_at
  on public.listings (status, created_at desc);

-- 2. Foreign key indexes for joined tables
create index if not exists idx_listings_developer_id
  on public.listings (developer_id);

create index if not exists idx_listings_project_id
  on public.listings (project_id);

create index if not exists idx_listings_agent_id
  on public.listings (agent_id);

create index if not exists idx_listings_posted_by
  on public.listings (posted_by);
