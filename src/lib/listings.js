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
  const bhkList = Array.isArray(row.bhk) ? row.bhk : (row.bhk ? [row.bhk] : []);
  return {
    id: row.id,
    dbId: row.id,
    listingCode: row.listing_code || null,        // human-readable ID, e.g. "PB000042" — auto-assigned by DB trigger
    title: row.title,
    price: row.price_label,
    priceRaw: Number(row.price_value) || 0,
    area: row.area_sqft ? `${row.area_sqft} sqft` : null,
    location: row.location,
    type: row.property_type,
    bhk: bhkList,                                 // array now — a listing can span multiple BHK configs
    bhkLabel: bhkList.join(", ") || null,          // convenience display string, e.g. "2 BHK, 3 BHK"
    status: row.possession || null,              // possession: "Ready to Move" | "Under Construction"
    moderationStatus: row.status,                 // "Live" | "Pending" | "Flagged" | "Rejected" (admin-only concept)
    postedBy: row.posted_by,
    postedDays: row.created_at ? daysAgo(row.created_at) : 0,
    imgCount: (row.images || []).length || 1,
    verified: !!row.verified,
    featured: !!row.featured,
    transactionType: row.transaction_type || "Buy",
    listingType: row.listing_type || null,        // Sale | Rent | Lease | Resale | New Launch | Under Construction
    tags: row.tags || [],
    amenities: row.amenities || [],
    floor: row.floor || null,
    facing: row.facing || null,
    age: row.age || null,

    // ── Project identity ──
    projectName: row.project_name || null,
    towerBlock: row.tower_block || null,
    unitNumber: row.unit_number || null,
    unitNumberPublic: row.unit_number_public !== false,

    // ── Room configuration ──
    bathrooms: row.bathrooms != null ? row.bathrooms : null,
    balconies: row.balconies != null ? row.balconies : null,
    servantRoom: !!row.servant_room,

    // ── Area breakdown (sqft) ──
    builtUpArea: row.built_up_area_sqft != null ? row.built_up_area_sqft : null,
    superBuiltUpArea: row.super_built_up_area_sqft != null ? row.super_built_up_area_sqft : null,
    carpetArea: row.carpet_area_sqft != null ? row.carpet_area_sqft : null,
    plotArea: row.plot_area_sqft != null ? row.plot_area_sqft : null,

    // ── Floor / tower structure ──
    floorNumber: row.floor_number != null ? row.floor_number : null,
    totalFloors: row.total_floors != null ? row.total_floors : null,
    totalUnits: row.total_units != null ? row.total_units : null,

    // ── Direction, Vastu, furnishing, condition ──
    entranceDirection: row.entrance_direction || null,
    vastuStatus: row.vastu_status || null,
    furnishing: row.furnishing || null,
    condition: row.property_condition || null,

    images: row.images && row.images.length ? row.images : (row.image_url ? [row.image_url] : [PLACEHOLDER_IMAGE]),
    videoUrls: row.video_urls || [],
    googleMapsLink: row.google_maps_link || null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    badge: row.badge || null,
    badgeColor: row.badge_color || "#1E88E5",
    description: row.description || "",
    views: row.views || 0,
    createdAt: row.created_at,
  };
}

// 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11-13 -> "th", etc.
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Builds the legacy free-text `floor` display string (e.g. "8th of 12") from
// the new structured floor_number/total_floors fields, so existing display
// code (property cards, PropertyDetail quick facts) keeps working unchanged.
function deriveFloorText(floorNumber, totalFloors) {
  if (floorNumber == null || floorNumber === "") return null;
  const n = parseInt(floorNumber, 10);
  if (Number.isNaN(n)) return null;
  if (n === 0) return totalFloors ? `Ground of ${totalFloors}` : "Ground";
  return totalFloors ? `${ordinal(n)} of ${totalFloors}` : `${ordinal(n)} Floor`;
}

// ── UI shape (admin form) -> DB row ──────────────────────────────────────────
export function denormalizeListing(f) {
  const builtUpArea = f.builtUpArea ? parseInt(f.builtUpArea, 10) || null : null;
  const superBuiltUpArea = f.superBuiltUpArea ? parseInt(f.superBuiltUpArea, 10) || null : null;
  const carpetArea = f.carpetArea ? parseInt(f.carpetArea, 10) || null : null;
  const plotArea = f.plotArea ? parseInt(f.plotArea, 10) || null : null;
  const floorNumber = f.floorNumber !== "" && f.floorNumber != null ? parseInt(f.floorNumber, 10) : null;
  const totalFloors = f.totalFloors ? parseInt(f.totalFloors, 10) || null : null;

  return {
    title: f.title,
    location: f.location,
    property_type: f.type,
    price_label: f.price,
    price_value: Number(f.priceRaw) || 0,
    status: f.moderationStatus || "Pending",
    posted_by: f.postedBy,
    transaction_type: f.transactionType,
    listing_type: f.listingType || null,
    possession: f.status || null,
    bhk: Array.isArray(f.bhk) ? f.bhk : (f.bhk ? [f.bhk] : []),
    // area_sqft stays in sync automatically — first area figure the admin/owner
    // actually filled in (built-up > super built-up > carpet > plot), falling
    // back to a legacy plain "area" value only if none of those are set — so
    // existing cards, sorting, and search filters keep working unchanged.
    area_sqft: builtUpArea || superBuiltUpArea || carpetArea || plotArea || (f.area ? parseInt(f.area, 10) || null : null),
    // legacy `floor` text stays in sync from the structured fields below,
    // unless something already set it directly (e.g. old data).
    floor: deriveFloorText(floorNumber, totalFloors) || f.floor || null,
    facing: f.facing || null,
    age: f.age || null,
    description: f.description || null,
    tags: f.tags || [],
    amenities: f.amenities || [],
    images: f.images || [],
    image_url: f.images && f.images[0] ? f.images[0] : null,
    video_urls: f.videoUrls || [],
    google_maps_link: f.googleMapsLink || null,
    latitude: f.latitude != null && f.latitude !== "" ? Number(f.latitude) : null,
    longitude: f.longitude != null && f.longitude !== "" ? Number(f.longitude) : null,
    featured: !!f.featured,
    verified: !!f.verified,
    badge: f.badge || null,
    badge_color: f.badgeColor || null,

    // ── Project identity ── (listing_code is server-generated; never written here)
    project_name: f.projectName || null,
    tower_block: f.towerBlock || null,
    unit_number: f.unitNumber || null,
    unit_number_public: f.unitNumberPublic !== false,

    // ── Room configuration ──
    bathrooms: f.bathrooms !== "" && f.bathrooms != null ? parseInt(f.bathrooms, 10) || null : null,
    balconies: f.balconies !== "" && f.balconies != null ? parseInt(f.balconies, 10) || null : null,
    servant_room: !!f.servantRoom,

    // ── Area breakdown ──
    built_up_area_sqft: builtUpArea,
    super_built_up_area_sqft: superBuiltUpArea,
    carpet_area_sqft: carpetArea,
    plot_area_sqft: plotArea,

    // ── Floor / tower structure ──
    floor_number: floorNumber,
    total_floors: totalFloors,
    total_units: f.totalUnits ? parseInt(f.totalUnits, 10) || null : null,

    // ── Direction, Vastu, furnishing, condition ──
    entrance_direction: f.entranceDirection || null,
    vastu_status: f.vastuStatus || null,
    furnishing: f.furnishing || null,
    property_condition: f.condition || null,

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
