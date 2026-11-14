-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 036 — Poster Identity & Verification Details
-- Adds poster_address to listings and expands listing_contacts to store
-- poster's name, email, and address for private admin identification.
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add poster_address to listings table
alter table public.listings add column if not exists poster_address text;

-- 2. Expand listing_contacts to store full private identity
alter table public.listing_contacts add column if not exists name text;
alter table public.listing_contacts add column if not exists email text;
alter table public.listing_contacts add column if not exists address text;

