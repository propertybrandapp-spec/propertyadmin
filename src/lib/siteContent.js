import { supabase, safeQuery } from "./supabaseClient";

// ── Site Content Data Layer (admin — full CRUD) ──────────────────────────────
// Backs the "Site Content" admin page (four tabs: Partner Tiers, Client
// Reviews, Subscription Plans, Investment Opportunities). Each of these used
// to be a hardcoded constant in the corresponding public page's source file
// — see supabase/migration_007_site_content.sql for the tables/RLS this
// talks to.

// ═══════════════════════════════════════════════════════════════════════════
// Partner Tiers
// ═══════════════════════════════════════════════════════════════════════════

export function normalizePartnerTier(row) {
  return {
    id: row.id,
    dbId: row.id,
    name: row.name,
    color: row.tier_color,
    borderColor: row.border_color,
    deals: row.deals_range,
    commission: row.commission,
    perks: Array.isArray(row.perks) ? row.perks : [],
    cta: row.cta_label,
    popular: row.is_popular,
    active: row.is_active,
    order: row.display_order,
    createdAt: row.created_at,
  };
}

export async function fetchAdminPartnerTiers() {
  const { data, error } = await safeQuery(
    supabase.from("partner_tiers").select("*").order("display_order", { ascending: true })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizePartnerTier), error: null };
}

function denormalizePartnerTier(t) {
  return {
    name: t.name,
    tier_color: t.color || "#6B7280",
    border_color: t.borderColor || "#E2E8F0",
    deals_range: t.deals || null,
    commission: t.commission || null,
    perks: t.perks || [],
    cta_label: t.cta || "Apply Now",
    is_popular: !!t.popular,
    is_active: t.active !== false,
    display_order: t.order || 0,
  };
}

export async function createPartnerTier(tier) {
  const { data, error } = await safeQuery(
    supabase.from("partner_tiers").insert(denormalizePartnerTier(tier)).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizePartnerTier(data), error: null };
}

export async function updatePartnerTier(id, tier) {
  const { data, error } = await safeQuery(
    supabase.from("partner_tiers").update(denormalizePartnerTier(tier)).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizePartnerTier(data), error: null };
}

export async function deletePartnerTier(id) {
  const { error } = await safeQuery(supabase.from("partner_tiers").delete().eq("id", id));
  return { error };
}

// ═══════════════════════════════════════════════════════════════════════════
// Client Reviews
// ═══════════════════════════════════════════════════════════════════════════

export function normalizeClientReview(row) {
  return {
    id: row.id,
    dbId: row.id,
    name: row.name,
    role: row.role,
    location: row.location,
    avatar: row.avatar_initials,
    avatarBg: row.avatar_gradient,
    rating: row.rating,
    category: row.category,
    text: row.review_text,
    property: row.property_label,
    date: row.review_date,
    verified: row.is_verified,
    active: row.is_active,
    order: row.display_order,
    createdAt: row.created_at,
  };
}

export async function fetchAdminClientReviews() {
  const { data, error } = await safeQuery(
    supabase.from("client_reviews").select("*").order("display_order", { ascending: true })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeClientReview), error: null };
}

function denormalizeClientReview(r) {
  return {
    name: r.name,
    role: r.role || null,
    location: r.location || null,
    avatar_initials: r.avatar || (r.name ? r.name.slice(0, 2).toUpperCase() : null),
    avatar_gradient: r.avatarBg || "from-blue-500 to-blue-700",
    rating: r.rating || 5,
    category: r.category || null,
    review_text: r.text,
    property_label: r.property || null,
    review_date: r.date || new Date().toISOString().slice(0, 10),
    is_verified: r.verified !== false,
    is_active: r.active !== false,
    display_order: r.order || 0,
  };
}

export async function createClientReview(review) {
  const { data, error } = await safeQuery(
    supabase.from("client_reviews").insert(denormalizeClientReview(review)).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeClientReview(data), error: null };
}

export async function updateClientReview(id, review) {
  const { data, error } = await safeQuery(
    supabase.from("client_reviews").update(denormalizeClientReview(review)).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeClientReview(data), error: null };
}

export async function deleteClientReview(id) {
  const { error } = await safeQuery(supabase.from("client_reviews").delete().eq("id", id));
  return { error };
}

// ═══════════════════════════════════════════════════════════════════════════
// Subscription Plans
// ═══════════════════════════════════════════════════════════════════════════

export function normalizeSubscriptionPlan(row) {
  return {
    id: row.id,
    dbId: row.id,
    name: row.name,
    price: row.price_label,
    period: row.billing_period,
    idealFor: row.ideal_for,
    color: row.plan_color,
    borderColor: row.border_color,
    features: Array.isArray(row.features) ? row.features : [],
    popular: row.is_popular,
    active: row.is_active,
    order: row.display_order,
    createdAt: row.created_at,
  };
}

export async function fetchAdminSubscriptionPlans() {
  const { data, error } = await safeQuery(
    supabase.from("subscription_plans").select("*").order("display_order", { ascending: true })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeSubscriptionPlan), error: null };
}

function denormalizeSubscriptionPlan(p) {
  return {
    name: p.name,
    price_label: p.price,
    billing_period: p.period || "/month",
    ideal_for: p.idealFor || null,
    plan_color: p.color || "#6B7280",
    border_color: p.borderColor || "#E2E8F0",
    features: p.features || [],
    is_popular: !!p.popular,
    is_active: p.active !== false,
    display_order: p.order || 0,
  };
}

export async function createSubscriptionPlan(plan) {
  const { data, error } = await safeQuery(
    supabase.from("subscription_plans").insert(denormalizeSubscriptionPlan(plan)).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeSubscriptionPlan(data), error: null };
}

export async function updateSubscriptionPlan(id, plan) {
  const { data, error } = await safeQuery(
    supabase.from("subscription_plans").update(denormalizeSubscriptionPlan(plan)).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeSubscriptionPlan(data), error: null };
}

export async function deleteSubscriptionPlan(id) {
  const { error } = await safeQuery(supabase.from("subscription_plans").delete().eq("id", id));
  return { error };
}

// ═══════════════════════════════════════════════════════════════════════════
// Investment Opportunities
// ═══════════════════════════════════════════════════════════════════════════

export function normalizeInvestmentOpportunity(row) {
  return {
    id: row.id,
    dbId: row.id,
    city: row.city,
    area: row.area,
    tag: row.tag,
    tagColor: row.tag_color,
    appreciation: row.appreciation,
    rentalYield: row.rental_yield,
    priceRange: row.price_range,
    type: row.property_type,
    image: row.image_url,
    active: row.is_active,
    order: row.display_order,
    createdAt: row.created_at,
  };
}

export async function fetchAdminInvestmentOpportunities() {
  const { data, error } = await safeQuery(
    supabase.from("investment_opportunities").select("*").order("display_order", { ascending: true })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeInvestmentOpportunity), error: null };
}

function denormalizeInvestmentOpportunity(o) {
  return {
    city: o.city || "Bhubaneswar",
    area: o.area,
    tag: o.tag || null,
    tag_color: o.tagColor || "bg-blue-100 text-[#1565C0]",
    appreciation: o.appreciation || null,
    rental_yield: o.rentalYield || null,
    price_range: o.priceRange || null,
    property_type: o.type || null,
    image_url: o.image || null,
    is_active: o.active !== false,
    display_order: o.order || 0,
  };
}

export async function createInvestmentOpportunity(opp) {
  const { data, error } = await safeQuery(
    supabase.from("investment_opportunities").insert(denormalizeInvestmentOpportunity(opp)).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeInvestmentOpportunity(data), error: null };
}

export async function updateInvestmentOpportunity(id, opp) {
  const { data, error } = await safeQuery(
    supabase.from("investment_opportunities").update(denormalizeInvestmentOpportunity(opp)).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeInvestmentOpportunity(data), error: null };
}

export async function deleteInvestmentOpportunity(id) {
  const { error } = await safeQuery(supabase.from("investment_opportunities").delete().eq("id", id));
  return { error };
}

// ═══════════════════════════════════════════════════════════════════════════
// Hero Content (singleton — headline, subtext, search tabs, quick CTAs, promo card)
// ═══════════════════════════════════════════════════════════════════════════

function normalizeHeroContent(row) {
  if (!row) return null;
  return {
    dbId: row.id,
    headlinePrefix: row.headline_prefix || "",
    headlineHighlight: row.headline_highlight || "",
    headlineSuffix: row.headline_suffix || "",
    subtext: row.subtext || "",
    searchTabs: Array.isArray(row.search_tabs) ? row.search_tabs : [],
    quickCtas: Array.isArray(row.quick_ctas) ? row.quick_ctas : [],
    promoBadge: row.promo_badge || "",
    promoImage: row.promo_image || "",
    promoEyebrow: row.promo_eyebrow || "",
    promoHeading: row.promo_heading || "",
    promoCtaLabel: row.promo_cta_label || "",
    promoCtaLinkType: row.promo_cta_link_type || "page",
    promoCtaLinkValue: row.promo_cta_link_value || "",
  };
}

export async function fetchAdminHeroContent() {
  const { data, error } = await safeQuery(supabase.from("hero_content").select("*").limit(1));
  if (error) return { data: null, error };
  return { data: normalizeHeroContent(data && data[0]), error: null };
}

export async function updateHeroContent(id, content) {
  const payload = {
    headline_prefix: content.headlinePrefix || null,
    headline_highlight: content.headlineHighlight || null,
    headline_suffix: content.headlineSuffix || null,
    subtext: content.subtext || null,
    search_tabs: content.searchTabs || [],
    quick_ctas: content.quickCtas || [],
    promo_badge: content.promoBadge || null,
    promo_image: content.promoImage || null,
    promo_eyebrow: content.promoEyebrow || null,
    promo_heading: content.promoHeading || null,
    promo_cta_label: content.promoCtaLabel || null,
    promo_cta_link_type: content.promoCtaLinkType || "page",
    promo_cta_link_value: content.promoCtaLinkValue || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await safeQuery(
    supabase.from("hero_content").update(payload).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeHeroContent(data), error: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// Hero Cards (the property-type card grid under the Hero search box)
// ═══════════════════════════════════════════════════════════════════════════

function normalizeHeroCard(row) {
  return {
    id: row.id,
    dbId: row.id,
    image: row.image_url || "",
    backgroundColor: row.background_color || "",
    title: row.title || "",
    subtitle: row.subtitle || "",
    cta: row.cta_label || "",
    linkType: row.link_type || "page",
    linkValue: row.link_value || "",
    active: row.is_active,
    order: row.display_order,
    createdAt: row.created_at,
  };
}

export async function fetchAdminHeroCards() {
  const { data, error } = await safeQuery(
    supabase.from("hero_cards").select("*").order("display_order", { ascending: true })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeHeroCard), error: null };
}

function denormalizeHeroCard(c) {
  return {
    image_url: c.image || null,
    background_color: c.backgroundColor || null,
    title: c.title,
    subtitle: c.subtitle || null,
    cta_label: c.cta || "Explore",
    link_type: c.linkType || "page",
    link_value: c.linkValue || null,
    is_active: c.active !== false,
    display_order: c.order || 0,
  };
}

export async function createHeroCard(card) {
  const { data, error } = await safeQuery(
    supabase.from("hero_cards").insert(denormalizeHeroCard(card)).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeHeroCard(data), error: null };
}

export async function updateHeroCard(id, card) {
  const { data, error } = await safeQuery(
    supabase.from("hero_cards").update(denormalizeHeroCard(card)).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeHeroCard(data), error: null };
}

export async function deleteHeroCard(id) {
  const { error } = await safeQuery(supabase.from("hero_cards").delete().eq("id", id));
  return { error };
}

// ═══════════════════════════════════════════════════════════════════════════
// Site Settings (singleton — contact info + social links)
// ═══════════════════════════════════════════════════════════════════════════

function normalizeSiteSettings(row) {
  if (!row) return null;
  return {
    dbId: row.id,
    phone: row.phone || "",
    whatsapp: row.whatsapp || "",
    email: row.email || "",
    website: row.website_url || "",
    address: row.corporate_address || "",
    businessHours: row.business_hours || "",
    facebook: row.facebook_url || "",
    instagram: row.instagram_url || "",
    linkedin: row.linkedin_url || "",
    youtube: row.youtube_url || "",
    legalDisclaimer: row.legal_disclaimer || "",
  };
}

export async function fetchAdminSiteSettings() {
  const { data, error } = await safeQuery(supabase.from("site_settings").select("*").limit(1));
  if (error) return { data: null, error };
  return { data: normalizeSiteSettings(data && data[0]), error: null };
}

export async function updateSiteSettings(id, settings) {
  const payload = {
    phone: settings.phone || null,
    whatsapp: settings.whatsapp || null,
    email: settings.email || null,
    website_url: settings.website || null,
    corporate_address: settings.address || null,
    business_hours: settings.businessHours || null,
    facebook_url: settings.facebook || null,
    instagram_url: settings.instagram || null,
    linkedin_url: settings.linkedin || null,
    youtube_url: settings.youtube || null,
    legal_disclaimer: settings.legalDisclaimer || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await safeQuery(
    supabase.from("site_settings").update(payload).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeSiteSettings(data), error: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// Office Locations
// ═══════════════════════════════════════════════════════════════════════════

export function normalizeOfficeLocation(row) {
  return {
    id: row.id,
    dbId: row.id,
    city: row.city,
    address: row.address,
    phone: row.phone,
    active: row.is_active,
    order: row.display_order,
    createdAt: row.created_at,
  };
}

export async function fetchAdminOfficeLocations() {
  const { data, error } = await safeQuery(
    supabase.from("office_locations").select("*").order("display_order", { ascending: true })
  );
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeOfficeLocation), error: null };
}

function denormalizeOfficeLocation(o) {
  return {
    city: o.city,
    address: o.address,
    phone: o.phone || null,
    is_active: o.active !== false,
    display_order: o.order || 0,
  };
}

export async function createOfficeLocation(office) {
  const { data, error } = await safeQuery(
    supabase.from("office_locations").insert(denormalizeOfficeLocation(office)).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeOfficeLocation(data), error: null };
}

export async function updateOfficeLocation(id, office) {
  const { data, error } = await safeQuery(
    supabase.from("office_locations").update(denormalizeOfficeLocation(office)).eq("id", id).select().single()
  );
  if (error) return { data: null, error };
  return { data: normalizeOfficeLocation(data), error: null };
}

export async function deleteOfficeLocation(id) {
  const { error } = await safeQuery(supabase.from("office_locations").delete().eq("id", id));
  return { error };
}
