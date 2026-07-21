import { supabase, safeQuery } from "./supabaseClient";
import { deleteFromR2 } from "./r2Upload";

// Shown when a listing has no photos yet (e.g. just created, images still uploading)
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=380&fit=crop";

// ── Listings Data Layer ───────────────────────────────────────────────────────
// Every component that reads or writes property listings (SearchResults,
// PropertyDetail, the Admin listings screen + form) goes through this file
// instead of calling `supabase.from("listings")` directly. That keeps the
// DB <-> UI field-name mapping (snake_case <-> camelCase) in exactly one place.
//
// Every function below resolves via safeQuery(), so a network-level failure
// (offline, misconfigured .env, Supabase outage) always comes back as a
// normal { data, error } result instead of throwing — callers just check
// `error` the same way they'd check a regular DB/RLS error.

// ── DB row -> UI shape ────────────────────────────────────────────────────────
// The UI (PropertyCardList/Grid, PropertyDetail, filters, etc.) always works
// with this shape.
export function normalizeListing(row) {
  return {
    id: row.id,
    dbId: row.id,
    title: row.title,
    price: row.price_label,
    priceRaw: Number(row.price_value) || 0,
    area: row.area_sqft ? `${row.area_sqft} sqft` : null,
    location: row.location,
    type: row.property_type,
    bhk: row.bhk || null,
    status: row.possession || null,              // possession: "Ready to Move" | "Under Construction"
    moderationStatus: row.status,                 // "Live" | "Pending" | "Flagged" | "Rejected" (admin-only concept)
    postedBy: row.posted_by,
    postedDays: row.created_at ? daysAgo(row.created_at) : 0,
    imgCount: (row.images || []).length || 1,
    verified: !!row.verified,
    featured: !!row.featured,
    transactionType: row.transaction_type || "Buy",
    tags: row.tags || [],
    amenities: row.amenities || [],
    floor: row.floor || null,
    facing: row.facing || null,
    age: row.age || null,
    images: row.images && row.images.length ? row.images : (row.image_url ? [row.image_url] : [PLACEHOLDER_IMAGE]),
    badge: row.badge || null,
    badgeColor: row.badge_color || "#2C9DD5",
    description: row.description || "",
    views: row.views || 0,
    createdAt: row.created_at,
  };
}

// ── UI shape (admin form) -> DB row ──────────────────────────────────────────
export function denormalizeListing(f) {
  return {
    title: f.title,
    location: f.location,
    property_type: f.type,
    price_label: f.price,
    price_value: Number(f.priceRaw) || 0,
    status: f.moderationStatus || "Pending",
    posted_by: f.postedBy,
    transaction_type: f.transactionType,
    possession: f.status || null,
    bhk: f.bhk || null,
    area_sqft: f.area ? parseInt(f.area, 10) || null : null,
    floor: f.floor || null,
    facing: f.facing || null,
    age: f.age || null,
    description: f.description || null,
    tags: f.tags || [],
    amenities: f.amenities || [],
    images: f.images || [],
    image_url: f.images && f.images[0] ? f.images[0] : null,
    featured: !!f.featured,
    verified: !!f.verified,
    badge: f.badge || null,
    badge_color: f.badgeColor || null,
    updated_at: new Date().toISOString(),
  };
}

function daysAgo(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// ── Public site: only ever see moderation-approved ("Live") listings ────────
export async function fetchPublicListings() {
  const { data, error } = await safeQuery(
    supabase.from("listings").select("*").eq("status", "Live").order("created_at", { ascending: false })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeListing), error: null };
}

// ── Admin console: sees every listing regardless of moderation status ───────
export async function fetchAdminListings() {
  const { data, error } = await safeQuery(
    supabase.from("listings").select("*").order("created_at", { ascending: false })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeListing), error: null };
}

export async function fetchListingById(id) {
  const { data, error } = await safeQuery(supabase.from("listings").select("*").eq("id", id).single());
  if (error) return { data: null, error };
  return { data: normalizeListing(data), error: null };
}

// Used by the Saved Properties page — fetches full listing rows for a set of
// previously-saved ids (the SavedItemsContext only tracks the ids themselves).
export async function fetchListingsByIds(ids) {
  if (!ids || ids.length === 0) return { data: [], error: null };
  const { data, error } = await safeQuery(supabase.from("listings").select("*").in("id", ids));
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeListing), error: null };
}

// Used by the "My Properties" page — every listing the current user has ever
// submitted, regardless of moderation status, so they can track it.
export async function fetchMyListings(userId) {
  const { data, error } = await safeQuery(
    supabase.from("listings").select("*").eq("posted_by_user_id", userId).order("created_at", { ascending: false })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeListing), error: null };
}

export async function createListing(property) {
  const { data: sessionData } = await safeQuery(supabase.auth.getSession());
  const payload = denormalizeListing(property);
  if (sessionData?.session) payload.posted_by_user_id = sessionData.session.user.id;

  const { data, error } = await safeQuery(supabase.from("listings").insert(payload).select().single());
  if (error) return { data: null, error };
  return { data: normalizeListing(data), error: null };
}

export async function updateListing(id, property) {
  const payload = denormalizeListing(property);
  const { data, error } = await safeQuery(supabase.from("listings").update(payload).eq("id", id).select().single());
  if (error) return { data: null, error };
  return { data: normalizeListing(data), error: null };
}

export async function updateListingStatus(id, status) {
  const { data, error } = await safeQuery(
    supabase.from("listings").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeListing(data), error: null };
}

// Deletes the DB row and best-effort cleans up its R2 images too.
export async function deleteListing(id, images) {
  if (images && images.length) {
    await deleteFromR2(images); // best-effort — a failed image cleanup shouldn't block deleting the listing
  }
  const { error } = await safeQuery(supabase.from("listings").delete().eq("id", id));
  return { error };
}
