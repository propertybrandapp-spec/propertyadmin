-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 035 — Public Feedback Submission & Admin Approval
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure RLS is active on client_reviews
alter table public.client_reviews enable row level security;

-- 2. Allow anonymous and authenticated public visitors to submit feedback.
--    Enforces is_active = false so every submission is pending admin review.
drop policy if exists "Public can submit client reviews" on public.client_reviews;
create policy "Public can submit client reviews"
  on public.client_reviews for insert
  to anon, authenticated
  with check (is_active = false);

-- 3. Public can read only approved/active reviews
drop policy if exists "Public can view active client reviews" on public.client_reviews;
create policy "Public can view active client reviews"
  on public.client_reviews for select
  using (is_active = true);

-- 4. Admins have full access to view, approve (set active = true), edit, and delete
drop policy if exists "Admins can manage all client reviews" on public.client_reviews;
create policy "Admins can manage all client reviews"
  on public.client_reviews for all
  using (
    auth.uid() in (select id from public.admin_profiles)
  );
