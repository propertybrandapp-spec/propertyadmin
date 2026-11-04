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
