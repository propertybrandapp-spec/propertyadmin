import { supabase, safeQuery } from "./supabaseClient";
import { deleteFromR2 } from "./r2Upload";

// Shown when a listing has no photos yet (e.g. just created, images still uploading)
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=380&fit=crop";

// ── Section 2C: nearby-landmark categories ─────────────────────────────────
// The 8 specific categories admins pick from when adding a nearby landmark...
export const LANDMARK_CATEGORIES = ["School", "Hospital", "Market", "Railway Station", "Airport", "Metro/Bus Stop", "Business Hub", "Other"];
// ...grouped into the 5 broader "map layers" the property page filters by.
export const LANDMARK_LAYERS = ["Schools", "Hospitals", "Transit", "Daily Needs", "Employment Hubs"];
export const LANDMARK_LAYER_GROUPS = {
  "School": "Schools",
  "Hospital": "Hospitals",
  "Railway Station": "Transit",
  "Airport": "Transit",
  "Metro/Bus Stop": "Transit",
  "Market": "Daily Needs",
  "Other": "Daily Needs",
  "Business Hub": "Employment Hubs",
};

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

    // ── Section 2B: Price & Financial Transparency ──
    priceNegotiable: !!row.price_negotiable,
    priceType: row.price_type || null,                                  // "All-Inclusive" | "Base Price"
    pricePerSqft: row.price_per_sqft != null ? Number(row.price_per_sqft) : null,  // DB-generated, read-only

    costBase: row.cost_base != null ? Number(row.cost_base) : null,
    costFloorRise: row.cost_floor_rise != null ? Number(row.cost_floor_rise) : null,
    costParking: row.cost_parking != null ? Number(row.cost_parking) : null,
    costClubhouse: row.cost_clubhouse != null ? Number(row.cost_clubhouse) : null,
    costPlc: row.cost_plc != null ? Number(row.cost_plc) : null,
    costGst: row.cost_gst != null ? Number(row.cost_gst) : null,
    costRegistration: row.cost_registration != null ? Number(row.cost_registration) : null,
    costMaintenanceDeposit: row.cost_maintenance_deposit != null ? Number(row.cost_maintenance_deposit) : null,
    costOther: row.cost_other != null ? Number(row.cost_other) : null,
    costOtherLabel: row.cost_other_label || null,

    maintenanceAmount: row.maintenance_amount != null ? Number(row.maintenance_amount) : null,
    maintenanceFrequency: row.maintenance_frequency || null,

    securityDeposit: row.security_deposit != null ? Number(row.security_deposit) : null,
    brokerageType: row.brokerage_type || null,
    brokerageAmount: row.brokerage_amount != null ? Number(row.brokerage_amount) : null,
    lockInPeriod: row.lock_in_period || null,
    noticePeriod: row.notice_period || null,
    leaseTerms: row.lease_terms || null,

    emiInterestRate: row.emi_interest_rate != null ? Number(row.emi_interest_rate) : 8.5,
    emiTenureYears: row.emi_tenure_years != null ? Number(row.emi_tenure_years) : 20,
    emiDownPaymentPercent: row.emi_down_payment_percent != null ? Number(row.emi_down_payment_percent) : 20,

    approvedBanks: row.approved_banks || [],
    loanEligibilityNotes: row.loan_eligibility_notes || null,

    estimatedMonthlyRent: row.estimated_monthly_rent != null ? Number(row.estimated_monthly_rent) : null,
    rentalYieldPercent: row.rental_yield_percent != null ? Number(row.rental_yield_percent) : null,  // DB-generated
    appreciationPotential: row.appreciation_potential || null,
    recommendedHoldingPeriod: row.recommended_holding_period || null,

    // ── Section 2C: Location & Connectivity ──
    locality: row.locality || null,
    landmark: row.landmark || null,
    city: row.city || null,
    pincode: row.pincode || null,
    addressVisibility: row.address_visibility || "Exact Address",
    nearbyLandmarks: Array.isArray(row.nearby_landmarks) ? row.nearby_landmarks : [],
    roadWidth: row.road_width || null,
    approachRoadDetails: row.approach_road_details || null,
    publicTransportNotes: row.public_transport_notes || null,
    neighbourhoodProfile: row.neighbourhood_profile || null,

    // ── Section 2D: Project & Developer Information ──
    developerId: row.developer_id || null,
    developerName: row.developer_name || row.developer?.name || null,  // plain-text fallback when not linked
    // Nested profile from the join (see LISTING_SELECT) — null if this
    // listing isn't linked to a verified developer/project profile.
    developer: row.developer ? {
      id: row.developer.id,
      name: row.developer.name,
      verified: !!row.developer.verified,
      experienceYears: row.developer.experience_years != null ? Number(row.developer.experience_years) : null,
      completedProjectsCount: row.developer.completed_projects_count != null ? Number(row.developer.completed_projects_count) : null,
      currentProjectsCount: row.developer.current_projects_count != null ? Number(row.developer.current_projects_count) : null,
      description: row.developer.description || null,
    } : null,
    projectId: row.project_id || null,
    project: row.project ? {
      id: row.project.id,
      name: row.project.name,
      landAreaAcres: row.project.land_area_acres != null ? Number(row.project.land_area_acres) : null,
      totalTowers: row.project.total_towers != null ? Number(row.project.total_towers) : null,
      totalFloors: row.project.total_floors != null ? Number(row.project.total_floors) : null,
      totalUnits: row.project.total_units != null ? Number(row.project.total_units) : null,
      unitsPerAcre: row.project.units_per_acre != null ? Number(row.project.units_per_acre) : null,
      homesPerFloor: row.project.homes_per_floor != null ? Number(row.project.homes_per_floor) : null,
      openSpacePercent: row.project.open_space_percent != null ? Number(row.project.open_space_percent) : null,
      constructionStage: row.project.construction_stage || null,
      constructionStageVerifiedAt: row.project.construction_stage_verified_at || null,
      expectedPossessionDate: row.project.expected_possession_date || null,
      handoverTimeline: row.project.handover_timeline || null,
      reraNumber: row.project.rera_number || null,
      reraState: row.project.rera_state || null,
      reraProjectName: row.project.rera_project_name || null,
      reraVerificationLink: row.project.rera_verification_link || null,
      approvals: Array.isArray(row.project.approvals) ? row.project.approvals : [],
      documents: Array.isArray(row.project.documents) ? row.project.documents : [],
      constructionQuality: row.project.construction_quality || null,
      structureType: row.project.structure_type || null,
      keyMaterials: row.project.key_materials || null,
    } : null,

    // ── Section 2E: Legal & Verification Information ──
    reraStatus: row.rera_status || "Pending Verification",
    ownershipType: row.ownership_type || null,
    titleStatus: row.title_status || null,
    documentVerificationStatus: row.document_verification_status || "Pending",
    encumbranceStatus: row.encumbrance_status || null,
    encumbranceNotes: row.encumbrance_notes || null,
    occupancyCertificateStatus: row.occupancy_certificate_status || null,
    completionCertificateStatus: row.completion_certificate_status || null,
    possessionCertificateStatus: row.possession_certificate_status || null,
    buildingPlanStatus: row.building_plan_status || null,
    propertyTaxStatus: row.property_tax_status || null,
    utilityConnectionStatus: row.utility_connection_status || null,
    utilityConnectionNotes: row.utility_connection_notes || null,
    posterVerified: !!row.poster_verified,
    verificationDate: row.verification_date || null,
    verificationSource: row.verification_source || null,

    // ── Section 2F: Amenities & Lifestyle ──
    // `amenities` itself is unchanged above (still the simple checklist that
    // powers search/filtering) — amenityDetails just layers optional
    // status/condition onto whichever of those are checked.
    amenityDetails: Array.isArray(row.amenity_details) ? row.amenity_details : [],
    unitFeatures: row.unit_features || [],
    parkingType: row.parking_type || null,
    parkingSlots: row.parking_slots != null ? Number(row.parking_slots) : null,
    evChargingStatus: row.ev_charging_status || null,
    powerBackupType: row.power_backup_type || null,
    securityFeatures: row.security_features || [],
    waterSource: row.water_source || null,
    waterSewageFeatures: row.water_sewage_features || [],
    internetReadiness: row.internet_readiness || null,
    mobileNetworkQuality: row.mobile_network_quality || null,
    petPolicy: row.pet_policy || null,
    petPolicyNotes: row.pet_policy_notes || null,
    seniorCitizenFeatures: row.senior_citizen_features || [],
    accessibilityFeatures: row.accessibility_features || [],

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
    updatedAt: row.updated_at || row.created_at,
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

    // ── Section 2B: Price & Financial Transparency ──
    // NOTE: price_per_sqft and rental_yield_percent are NOT written here —
    // they're DB-generated columns (STORED GENERATED ALWAYS AS), computed
    // automatically from price_value/area_sqft and estimated_monthly_rent.
    // Supabase/Postgres rejects any insert/update that tries to set them.
    price_negotiable: !!f.priceNegotiable,
    price_type: f.priceType || null,

    cost_base: numOrNull(f.costBase),
    cost_floor_rise: numOrNull(f.costFloorRise),
    cost_parking: numOrNull(f.costParking),
    cost_clubhouse: numOrNull(f.costClubhouse),
    cost_plc: numOrNull(f.costPlc),
    cost_gst: numOrNull(f.costGst),
    cost_registration: numOrNull(f.costRegistration),
    cost_maintenance_deposit: numOrNull(f.costMaintenanceDeposit),
    cost_other: numOrNull(f.costOther),
    cost_other_label: f.costOtherLabel || null,

    maintenance_amount: numOrNull(f.maintenanceAmount),
    maintenance_frequency: f.maintenanceFrequency || null,

    security_deposit: numOrNull(f.securityDeposit),
    brokerage_type: f.brokerageType || null,
    brokerage_amount: numOrNull(f.brokerageAmount),
    lock_in_period: f.lockInPeriod || null,
    notice_period: f.noticePeriod || null,
    lease_terms: f.leaseTerms || null,

    emi_interest_rate: f.emiInterestRate !== "" && f.emiInterestRate != null ? Number(f.emiInterestRate) : 8.5,
    emi_tenure_years: f.emiTenureYears !== "" && f.emiTenureYears != null ? parseInt(f.emiTenureYears, 10) : 20,
    emi_down_payment_percent: f.emiDownPaymentPercent !== "" && f.emiDownPaymentPercent != null ? Number(f.emiDownPaymentPercent) : 20,

    approved_banks: Array.isArray(f.approvedBanks) ? f.approvedBanks : [],
    loan_eligibility_notes: f.loanEligibilityNotes || null,

    estimated_monthly_rent: numOrNull(f.estimatedMonthlyRent),
    appreciation_potential: f.appreciationPotential || null,
    recommended_holding_period: f.recommendedHoldingPeriod || null,

    // ── Section 2C: Location & Connectivity ──
    locality: f.locality || null,
    landmark: f.landmark || null,
    city: f.city || null,
    pincode: f.pincode || null,
    address_visibility: f.addressVisibility || "Exact Address",
    // Strip the client-only `_key` (React list key) before saving.
    nearby_landmarks: Array.isArray(f.nearbyLandmarks)
      ? f.nearbyLandmarks
          .filter((l) => l.name || l.distance || l.travelTime)
          .map(({ category, name, distance, travelTime }) => ({ category, name, distance, travelTime }))
      : [],
    road_width: f.roadWidth || null,
    approach_road_details: f.approachRoadDetails || null,
    public_transport_notes: f.publicTransportNotes || null,
    neighbourhood_profile: f.neighbourhoodProfile || null,

    // ── Section 2D: Project & Developer Information ──
    // developer_id/project_id link to a full verified profile (admin-only —
    // see src/lib/developers.js); developer_name is a plain-text fallback
    // anyone (including public self-listers) can set directly. project_name
    // itself is already set above under Section 2A identity fields.
    developer_id: f.developerId || null,
    developer_name: f.developerName || null,
    project_id: f.projectId || null,

    // ── Section 2E: Legal & Verification Information ──
    // poster_verified / verification_date / verification_source /
    // document_verification_status and the certificate/status fields are
    // only ever meaningfully set from the Admin form — the public Post
    // Property form just leaves them at their defaults (see EMPTY_FORM
    // there, which only exposes ownershipType/reraStatus).
    rera_status: f.reraStatus || "Pending Verification",
    ownership_type: f.ownershipType || null,
    title_status: f.titleStatus || null,
    document_verification_status: f.documentVerificationStatus || "Pending",
    encumbrance_status: f.encumbranceStatus || null,
    encumbrance_notes: f.encumbranceNotes || null,
    occupancy_certificate_status: f.occupancyCertificateStatus || null,
    completion_certificate_status: f.completionCertificateStatus || null,
    possession_certificate_status: f.possessionCertificateStatus || null,
    building_plan_status: f.buildingPlanStatus || null,
    property_tax_status: f.propertyTaxStatus || null,
    utility_connection_status: f.utilityConnectionStatus || null,
    utility_connection_notes: f.utilityConnectionNotes || null,
    poster_verified: !!f.posterVerified,
    verification_date: f.verificationDate || null,
    verification_source: f.verificationSource || null,

    // ── Section 2F: Amenities & Lifestyle ──
    // Strip client-only `_key` (React list key) from amenity_details before saving.
    amenity_details: Array.isArray(f.amenityDetails)
      ? f.amenityDetails.filter((a) => a.name).map(({ name, status, condition }) => ({ name, status, condition }))
      : [],
    unit_features: Array.isArray(f.unitFeatures) ? f.unitFeatures : [],
    parking_type: f.parkingType || null,
    parking_slots: f.parkingSlots !== "" && f.parkingSlots != null ? parseInt(f.parkingSlots, 10) || null : null,
    ev_charging_status: f.evChargingStatus || null,
    power_backup_type: f.powerBackupType || null,
    security_features: Array.isArray(f.securityFeatures) ? f.securityFeatures : [],
    water_source: f.waterSource || null,
    water_sewage_features: Array.isArray(f.waterSewageFeatures) ? f.waterSewageFeatures : [],
    internet_readiness: f.internetReadiness || null,
    mobile_network_quality: f.mobileNetworkQuality || null,
    pet_policy: f.petPolicy || null,
    pet_policy_notes: f.petPolicyNotes || null,
    senior_citizen_features: Array.isArray(f.seniorCitizenFeatures) ? f.seniorCitizenFeatures : [],
    accessibility_features: Array.isArray(f.accessibilityFeatures) ? f.accessibilityFeatures : [],

    updated_at: new Date().toISOString(),
  };
}

// Small helper — "" / null / undefined -> null, otherwise a parsed number.
// Used throughout denormalizeListing for the many optional numeric fields.
function numOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function daysAgo(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// Every listing read pulls in its linked developer/project profile (if any)
// in the same query — Supabase resolves this via the FK relationship, no
// extra round-trip needed. Both come back `null` when a listing isn't linked
// to one (e.g. public self-listings, which only ever set developer_name /
// project_name plain text instead).
const LISTING_SELECT = "*, developer:developers(*), project:projects(*)";

// ── Public site: only ever see moderation-approved ("Live") listings ────────
export async function fetchPublicListings() {
  const { data, error } = await safeQuery(
    supabase.from("listings").select(LISTING_SELECT).eq("status", "Live").order("created_at", { ascending: false })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeListing), error: null };
}

// ── Admin console: sees every listing regardless of moderation status ───────
export async function fetchAdminListings() {
  const { data, error } = await safeQuery(
    supabase.from("listings").select(LISTING_SELECT).order("created_at", { ascending: false })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeListing), error: null };
}

export async function fetchListingById(id) {
  const { data, error } = await safeQuery(supabase.from("listings").select(LISTING_SELECT).eq("id", id).single());
  if (error) return { data: null, error };
  return { data: normalizeListing(data), error: null };
}

// Used by the Saved Properties page — fetches full listing rows for a set of
// previously-saved ids (the SavedItemsContext only tracks the ids themselves).
export async function fetchListingsByIds(ids) {
  if (!ids || ids.length === 0) return { data: [], error: null };
  const { data, error } = await safeQuery(supabase.from("listings").select(LISTING_SELECT).in("id", ids));
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeListing), error: null };
}

// Used by the "My Properties" page — every listing the current user has ever
// submitted, regardless of moderation status, so they can track it.
export async function fetchMyListings(userId) {
  const { data, error } = await safeQuery(
    supabase.from("listings").select(LISTING_SELECT).eq("posted_by_user_id", userId).order("created_at", { ascending: false })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeListing), error: null };
}

export async function createListing(property) {
  const { data: sessionData } = await safeQuery(supabase.auth.getSession());
  const payload = denormalizeListing(property);
  if (sessionData?.session) payload.posted_by_user_id = sessionData.session.user.id;

  const { data, error } = await safeQuery(supabase.from("listings").insert(payload).select(LISTING_SELECT).single());
  if (error) return { data: null, error };
  return { data: normalizeListing(data), error: null };
}

export async function updateListing(id, property) {
  const payload = denormalizeListing(property);
  const { data, error } = await safeQuery(supabase.from("listings").update(payload).eq("id", id).select(LISTING_SELECT).single());
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

// ── Section 2B: Price & Financial Transparency helpers ─────────────────────

// Every price change (auto-logged by a DB trigger — see migration_014),
// newest first. Powers the "Price History" list on the property detail page.
export async function fetchPriceHistory(listingId) {
  const { data, error } = await safeQuery(
    supabase.from("listing_price_history").select("*").eq("listing_id", listingId).order("changed_at", { ascending: false })
  );
  if (error) return { data: [], error };
  return {
    data: (data || []).map((row) => ({
      priceValue: Number(row.price_value) || 0,
      priceLabel: row.price_label,
      changedAt: row.changed_at,
    })),
    error: null,
  };
}

// "Comparable price range in the same locality" — other Live listings that
// share the exact `location` text (case-insensitive), same as the matching
// the location filter on SearchResults already uses. Returns min/max/avg
// price-per-sqft plus how many comparable listings that's based on.
export async function fetchComparableListings(location, excludeId) {
  if (!location) return { data: null, error: null };
  const { data, error } = await safeQuery(
    supabase.from("listings").select("id, price_per_sqft").eq("status", "Live").ilike("location", location)
  );
  if (error) return { data: null, error };
  const prices = (data || [])
    .filter((r) => r.id !== excludeId && r.price_per_sqft != null)
    .map((r) => Number(r.price_per_sqft));
  if (prices.length === 0) return { data: null, error: null };
  return {
    data: {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      count: prices.length,
    },
    error: null,
  };
}
