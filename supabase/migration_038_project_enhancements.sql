-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 038 — Listing & Project Enhancements
-- 1. Project Description
-- 2. Developer Description & Brand Positioning
-- 3. Construction Progress Percentage & Timeline Updates
-- 4. YouTube & Video Reviews
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Project Description
alter table public.listings add column if not exists project_description text;
alter table public.projects add column if not exists description text;

-- 2. Developer Brand Positioning
alter table public.listings add column if not exists developer_positioning text;
alter table public.developers add column if not exists positioning text;

-- 3. Construction Progress Percentage & Updates
alter table public.listings add column if not exists construction_percent integer;
alter table public.listings add column if not exists construction_updates text;
alter table public.projects add column if not exists construction_percent integer;
alter table public.projects add column if not exists construction_updates text;

-- 4. YouTube & Video Reviews
alter table public.listings add column if not exists video_reviews jsonb not null default '[]'::jsonb;
alter table public.projects add column if not exists video_reviews jsonb not null default '[]'::jsonb;
