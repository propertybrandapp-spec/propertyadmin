-- ─────────────────────────────────────────────────────────────────────────────
-- PropertyBrands — Migration 039: Grihapravesh Services & Sub-Services
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.grihapravesh_services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text default 'Puja & Rituals', -- 'Puja & Rituals', 'Decor & Ambience', 'Catering & Prasad', 'Deep Cleaning & Moving'
  description text,
  price_label text,
  inclusions jsonb default '[]'::jsonb,
  icon text default '🪔',
  image_url text,
  is_popular boolean default false,
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table public.grihapravesh_services enable row level security;

drop policy if exists "Public can view active grihapravesh services" on public.grihapravesh_services;
create policy "Public can view active grihapravesh services"
  on public.grihapravesh_services for select
  using (is_active = true);

drop policy if exists "Admins can manage grihapravesh services" on public.grihapravesh_services;
create policy "Admins can manage grihapravesh services"
  on public.grihapravesh_services for all
  using (true)
  with check (true);

-- Insert starter default sub-services
insert into public.grihapravesh_services (title, category, description, price_label, inclusions, icon, image_url, is_popular, display_order)
values
  (
    'Vedic Pandit & Complete Grihapravesh Havan',
    'Puja & Rituals',
    'Vastu Shanti, Navagraha Puja, Ganesh Pujan, and sacred cow entry coordination conducted by senior certified Vedic Pandits.',
    'Starts at ₹5,100',
    '["Vastu Shanti & Navagraha Havan", "Ganesh & Kuldevta Pujan", "Vedic Astrologer Muhurat calculation", "Havan Kund & ritual fire materials setup", "Prasadam sanctification"]'::jsonb,
    '🪔',
    'https://images.unsplash.com/photo-1609137144822-0d65942475a8?w=600&auto=format&fit=crop&q=80',
    true,
    1
  ),
  (
    'Complete Organic Puja Samagri & Essentials Kit',
    'Puja & Rituals',
    'All-in-one pre-packaged, authenticated 108 sacred puja items delivered to your doorstep 24 hours prior to muhurat.',
    'Starts at ₹2,499',
    '["Pure cow ghee & dry wood for havan", "Navadhanya, Gangajal & Kalash kit", "Toran, Rangoli powders & Diyas", "Camphor, Loban & Guggal incense", "Handmade cotton wicks & brass thali kit"]'::jsonb,
    '✨',
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
    false,
    2
  ),
  (
    'Traditional Floral Decor & Doorway Toran',
    'Decor & Ambience',
    'Fresh marigold and mango leaf doorway entrance arches, handcrafted floral rangolis, and fragrant brass urli water bowls.',
    'Starts at ₹4,500',
    '["Fresh marigold doorway toran & pillars", "Hand-crafted flower rangoli at entrance", "Living room focal puja altar backdrop", "Aromatic jasmine & rose petal bowl styling", "Eco-friendly natural setup & post-event cleanup"]'::jsonb,
    '🌸',
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80',
    true,
    3
  ),
  (
    'Pre-Muhurat Deep Cleaning & Sanitization',
    'Deep Cleaning & Moving',
    'Intensive single-day deep cleaning of floors, windows, kitchen cabinets, bathrooms, and high ceilings before sacred entry.',
    'Starts at ₹3,999',
    '["Single-disc rotary floor scrub & buff", "Kitchen degreasing & cabinet vacuuming", "Bathroom descaling & sanitization", "Glass window & sliding door track cleaning", "Aromatic organic herbal smoke fumigation"]'::jsonb,
    '🧹',
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
    false,
    4
  ),
  (
    'Sattvic Feast Catering & Custom Sweet Boxes',
    'Catering & Prasad',
    'Freshly cooked traditional vegetarian feast (no onion/garlic options available) and custom-packed gift boxes for your guests.',
    'Starts at ₹350 / plate',
    '["Authentic sattvic vegetarian menu", "Special Panchamrit & Mahaprasad preparation", "Live counter for hot puris and delicacies", "Personalized sweet boxes with custom thank-you tags", "Professional eco-friendly service crew"]'::jsonb,
    '🍲',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    false,
    5
  ),
  (
    'Muhurat Day Shifting & Essentials Relocation',
    'Deep Cleaning & Moving',
    'Punctual transportation of your sacred deity, puja mandir, and essential first-night household baggage right on muhurat hour.',
    'Starts at ₹4,999',
    '["Dedicated closed vehicle on muhurat hour", "Special protective velvet crating for Puja Mandir", "Careful handling of first milk-boiling vessel & stove", "Priority loading/unloading assistance", "Zero delay commitment"]'::jsonb,
    '🚚',
    'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=600&auto=format&fit=crop&q=80',
    false,
    6
  )
on conflict do nothing;
