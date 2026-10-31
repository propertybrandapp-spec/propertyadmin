import { supabase, safeQuery } from "./supabaseClient";
import { normalizeListing } from "./listings";

// ── Leads Data Layer ──────────────────────────────────────────────────────────
// Note: leads.assigned_to references auth.users(id) directly (not
// admin_profiles), so we resolve the assigned admin's name with a second,
// small query rather than relying on a PostgREST FK-embed that doesn't exist
// between these two tables.

function daysAgo(isoDate) {
  if (!isoDate) return null;
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function normalizeLead(row, adminsById, listingsById = {}) {
  let detectedSource = row.source;
  if (row.interest?.includes("[PROPERTY MANAGEMENT]")) detectedSource = "property-management";
  else if (row.interest?.includes("[CHANNEL PARTNER]")) detectedSource = "channel-partner";
  else if (row.interest?.includes("[RENTREADY")) detectedSource = "rent-ready";
  else if (row.interest?.includes("[SELECT MEMBERSHIP")) detectedSource = "select-membership";
  else if (row.interest?.includes("[BUILD & MOVE")) detectedSource = "build-move";
  else if (row.interest?.includes("[CONSULTATION")) detectedSource = "book-expert";
  else if (row.interest?.includes("[BROCHURE REQUEST]")) detectedSource = "brochure-request";

  return {
    id: row.id,
    dbId: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    interest: row.interest || row.message,
    message: row.message || row.interest,
    budget: row.budget_label,
    stage: row.stage,
    source: detectedSource,
    assignedTo: row.assigned_to ? (adminsById[row.assigned_to]?.full_name || "Unassigned") : "Unassigned",
    assignedToId: row.assigned_to,
    listingId: row.listing_id,
    // Full listing (title, location, price, specs, photos) so the admin can
    // see exactly which property this lead is about — null if the lead
    // isn't linked to one (e.g. a general "Contact Us" inquiry), or if that
    // listing has since been deleted.
    listing: row.listing_id ? (listingsById[row.listing_id] || null) : null,
    date: row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—",
    daysAgo: daysAgo(row.created_at),
    createdAt: row.created_at,

    // ── Section 3A: Quick Questions for Buyers ──
    clientId: row.client_id || null,
    buyerPurpose: row.buyer_purpose || null,
    buyerBudgetMax: row.buyer_budget_max != null ? Number(row.buyer_budget_max) : null,
    buyerComfortableEmi: row.buyer_comfortable_emi != null ? Number(row.buyer_comfortable_emi) : null,
    buyerPreferredLocations: row.buyer_preferred_locations || [],
    buyerAcceptableLocations: row.buyer_acceptable_locations || [],
    buyerExcludedLocations: row.buyer_excluded_locations || [],
    buyerPurchaseTimeline: row.buyer_purchase_timeline || null,
    buyerPriorityFactors: row.buyer_priority_factors || [],
    buyerLoanAssistance: row.buyer_loan_assistance || null,
    buyerOpenToUnderConstruction: row.buyer_open_to_under_construction || null,
    buyerMustHaveFeatures: row.buyer_must_have_features || [],
    buyerWantsComparison: !!row.buyer_wants_comparison,

    // ── Section 3B: Questions for Renters ──
    renterMoveInDate: row.renter_move_in_date || null,
    renterMonthlyRentBudget: row.renter_monthly_rent_budget != null ? Number(row.renter_monthly_rent_budget) : null,
    renterUpfrontBudget: row.renter_upfront_budget != null ? Number(row.renter_upfront_budget) : null,
    renterProfileType: row.renter_profile_type || null,
    renterFurnishingRequirement: row.renter_furnishing_requirement || null,
    renterLeaseDuration: row.renter_lease_duration || null,
    renterPetRequirement: row.renter_pet_requirement || null,
    renterParkingRequirement: row.renter_parking_requirement || null,
    renterPreferredLocalities: row.renter_preferred_localities || [],
    renterCommuteDestination: row.renter_commute_destination || null,
    renterWantsBrokerageFree: !!row.renter_wants_brokerage_free,
    renterWantsManagedRental: !!row.renter_wants_managed_rental,
  };
}

export async function fetchAdminLeads() {
  const [{ data: leads, error }, { data: admins }] = await Promise.all([
    safeQuery(supabase.from("leads").select("*").order("created_at", { ascending: false })),
    safeQuery(supabase.from("admin_profiles").select("id, full_name")),
  ]);

  let allLeads = Array.isArray(leads) ? [...leads] : [];

  function getLeadFingerprint(l) {
    const p = (l.phone || "").replace(/[^0-9]/g, "");
    const n = (l.name || "").trim().toLowerCase();
    const i = (l.interest || "").trim().toLowerCase().slice(0, 60);
    return `${p}|${n}|${i}`;
  }

  const existingIds = new Set(allLeads.map((l) => l.id).filter(Boolean));
  const existingFingerprints = new Set(allLeads.map(getLeadFingerprint));

  // In local development or when Supabase RLS restricts reads for demo admin,
  // sync with local dev leads storage so submitted leads appear immediately.
  try {
    const res = await fetch("/api/leads");
    if (res.ok) {
      const devLeads = await res.json();
      if (Array.isArray(devLeads)) {
        devLeads.forEach((dl) => {
          const fp = getLeadFingerprint(dl);
          if (!existingIds.has(dl.id) && !existingFingerprints.has(fp)) {
            allLeads.push(dl);
            if (dl.id) existingIds.add(dl.id);
            existingFingerprints.add(fp);
          }
        });
      }
    }
  } catch {}

  // Final deduplication pass to ensure 0 duplicates
  const finalLeads = [];
  const seenFp = new Set();
  allLeads.forEach((l) => {
    const fp = getLeadFingerprint(l);
    if (!seenFp.has(fp)) {
      seenFp.add(fp);
      finalLeads.push(l);
    }
  });

  // Sort by created_at descending
  finalLeads.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const adminsById = {};
  (admins || []).forEach((a) => { adminsById[a.id] = a; });

  // Batch-fetch every listing referenced by these leads in one query, so
  // the leads table/drawer can show the linked property's photo, price,
  // and specs without the admin having to go find it manually.
  const listingIds = [...new Set(finalLeads.map((l) => l.listing_id).filter(Boolean))];
  let listingsById = {};
  if (listingIds.length > 0) {
    const { data: listingRows } = await safeQuery(
      supabase.from("listings").select("*").in("id", listingIds)
    );
    (listingRows || []).forEach((row) => { listingsById[row.id] = normalizeListing(row); });
  }

  return { data: finalLeads.map((l) => normalizeLead(l, adminsById, listingsById)), error: null };
}

export async function updateLeadStage(id, stage) {
  try {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
  } catch {}

  const { data, error } = await safeQuery(
    supabase.from("leads").update({ stage, updated_at: new Date().toISOString() }).eq("id", id).select().single()
  );
  return { data, error: null };
}

export async function assignLead(id, adminUserId) {
  const { data, error } = await safeQuery(
    supabase.from("leads").update({ assigned_to: adminUserId, updated_at: new Date().toISOString() }).eq("id", id).select().single()
  );
  return { data, error };
}

export async function deleteLead(id) {
  try {
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
  } catch {}

  const { error } = await safeQuery(supabase.from("leads").delete().eq("id", id));
  return { error };
}

// Used by public forms (ContactUs.jsx, Footer's quick inquiry) — RLS allows
// anyone, even logged-out visitors, to insert a lead.
//
// listingId links this lead to a specific property (see PropertyDetail.jsx's
// "Contact"/"Schedule a Site Visit" buttons) so the admin can see exactly
// which listing it's about, with full specs/photos, from the Leads screen.
// stage defaults to "New" but "Schedule a Site Visit" passes "Site Visit"
// directly so it's immediately distinguishable in the pipeline.
//
// buyerPreferences (Section 3A — optional "Tell us more" step) mirrors
// client_profiles' Buyer Preferences shape: { purpose, budgetMax,
// comfortableEmi, preferredLocations, acceptableLocations,
// excludedLocations, purchaseTimeline, priorityFactors, loanAssistance,
// openToUnderConstruction, mustHaveFeatures, wantsComparison }. Every field
// is optional — omitted ones just stay at their DB default.
//
// renterPreferences (Section 3B) is the equivalent for Rent inquiries:
// { moveInDate, monthlyRentBudget, upfrontBudget, profileType,
// furnishingRequirement, leaseDuration, petRequirement, parkingRequirement,
// preferredLocalities, commuteDestination, wantsBrokerageFree,
// wantsManagedRental }.
export async function submitLead({ name, phone, email, interest, budget, source = "Website", listingId, stage, buyerPreferences = {}, renterPreferences = {} }) {
  const { data: sessionData } = await safeQuery(supabase.auth.getSession());
  const b = buyerPreferences;
  const r = renterPreferences;

  // DB constraint: check (source in ('Website', 'Referral', 'WhatsApp', 'Cold Call', 'Walk-in'))
  const ALLOWED_DB_SOURCES = ["Website", "Referral", "WhatsApp", "Cold Call", "Walk-in"];
  const dbSource = ALLOWED_DB_SOURCES.includes(source) ? source : "Website";

  // Ensure channel identifier tag is prefixed to interest for categorization in admin
  let finalInterest = interest || "";
  if (source === "property-management" && !finalInterest.includes("[PROPERTY MANAGEMENT]")) {
    finalInterest = `[PROPERTY MANAGEMENT] ${finalInterest}`.trim();
  } else if (source === "channel-partner" && !finalInterest.includes("[CHANNEL PARTNER]")) {
    finalInterest = `[CHANNEL PARTNER] ${finalInterest}`.trim();
  } else if (source === "rent-ready" && !finalInterest.includes("[RENTREADY")) {
    finalInterest = `[RENTREADY DRAFT] ${finalInterest}`.trim();
  } else if (source === "select-membership" && !finalInterest.includes("[SELECT MEMBERSHIP")) {
    finalInterest = `[SELECT MEMBERSHIP] ${finalInterest}`.trim();
  } else if (source === "build-move" && !finalInterest.includes("[BUILD & MOVE")) {
    finalInterest = `[BUILD & MOVE] ${finalInterest}`.trim();
  } else if (source === "book-expert" && !finalInterest.includes("[CONSULTATION")) {
    finalInterest = `[CONSULTATION BOOKING] ${finalInterest}`.trim();
  }

  const { error } = await safeQuery(
    supabase.from("leads").insert({
      name,
      phone,
      email: email || null,
      interest: finalInterest || null,
      budget_label: budget || null,
      source: dbSource,
      stage: stage || "New",
      listing_id: listingId || null,
      client_id: sessionData?.session?.user?.id || null,
      buyer_purpose: b.purpose || null,
      buyer_budget_max: b.budgetMax || null,
      buyer_comfortable_emi: b.comfortableEmi || null,
      buyer_preferred_locations: b.preferredLocations || [],
      buyer_acceptable_locations: b.acceptableLocations || [],
      buyer_excluded_locations: b.excludedLocations || [],
      buyer_purchase_timeline: b.purchaseTimeline || null,
      buyer_priority_factors: b.priorityFactors || [],
      buyer_loan_assistance: b.loanAssistance || null,
      buyer_open_to_under_construction: b.openToUnderConstruction || null,
      buyer_must_have_features: b.mustHaveFeatures || [],
      buyer_wants_comparison: !!b.wantsComparison,
      renter_move_in_date: r.moveInDate || null,
      renter_monthly_rent_budget: r.monthlyRentBudget || null,
      renter_upfront_budget: r.upfrontBudget || null,
      renter_profile_type: r.profileType || null,
      renter_furnishing_requirement: r.furnishingRequirement || null,
      renter_lease_duration: r.leaseDuration || null,
      renter_pet_requirement: r.petRequirement || null,
      renter_parking_requirement: r.parkingRequirement || null,
      renter_preferred_localities: r.preferredLocalities || [],
      renter_commute_destination: r.commuteDestination || null,
      renter_wants_brokerage_free: !!r.wantsBrokerageFree,
      renter_wants_managed_rental: !!r.wantsManagedRental,
    })
  );
  return { error };
}
