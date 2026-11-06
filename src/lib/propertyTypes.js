// ── Property-type helpers (pure) ─────────────────────────────────────────────
// The type dropdowns are normally driven by the database (listing_field_options).
// Types listed here are always offered even if the database list predates them,
// so e.g. "Duplex" can never go missing from the filter or the listing forms.
export const ALWAYS_OFFERED_TYPES = ["Duplex"];

// Dropdown options: the database/default list plus the always-offered types.
export function withExtraTypes(list) {
  const base = Array.isArray(list) ? list : [];
  const have = new Set(base.map((t) => String(t).toLowerCase()));
  return [...base, ...ALWAYS_OFFERED_TYPES.filter((t) => !have.has(t.toLowerCase()))];
}

// A listing's type is sometimes entered loosely (e.g. a duplex listed as "Villa"
// or "Independent House"). For these types, also accept a listing whose title,
// tags or description clearly say so, so filtering by "Duplex" finds them all.
const KEYWORD_TYPES = { duplex: /\bduplex(es)?\b/i };

export function matchesPropertyType(selectedTypes, p) {
  if (!selectedTypes || selectedTypes.length === 0) return true;
  const own = String(p.type ?? "").trim().toLowerCase();
  return selectedTypes.some((t) => {
    const want = String(t).trim().toLowerCase();
    if (own === want) return true;
    const re = KEYWORD_TYPES[want];
    if (!re) return false;
    return re.test([p.title, (p.tags || []).join(" "), p.description].filter(Boolean).join(" "));
  });
}

// ── Buy vs Rent ──────────────────────────────────────────────────────────────
// A listing has both a "Transaction" (Buy/Rent) and a "Listing Type"
// (Sale / Rent / Lease / Resale / …). If someone picked Listing Type "Rent" or
// "Lease" but left Transaction on its default "Buy", the property would have
// been hidden from every rental search. Listing Type wins.
const RENTAL_LISTING_TYPES = ["rent", "lease"];
export function transactionFor(listingType, transactionType) {
  if (RENTAL_LISTING_TYPES.includes(String(listingType ?? "").trim().toLowerCase())) return "Rent";
  return transactionType === "Rent" ? "Rent" : "Buy";
}

// Tag filters (e.g. "Co-living", "Student Accommodation", "Luxury") match a
// listing's tags, but also its property type and wording, so a category page
// isn't empty just because the poster didn't tick the exact tag.
const squash = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
export function matchesTags(selectedTags, p) {
  if (!selectedTags || selectedTags.length === 0) return true;
  const own = (p.tags || []).map(squash);
  const type = squash(p.type);
  const text = squash([p.title, p.description].filter(Boolean).join(" "));
  return selectedTags.some((t) => {
    const w = squash(t);
    return own.includes(w) || type === w || (w.length >= 6 && text.includes(w));
  });
}
