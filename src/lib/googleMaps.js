// ── Google Maps link / coordinate parsing (pure, no network) ─────────────────
// Lets an owner or admin paste a Google Maps link — or plain "lat, lng" —
// and get a map pin out of it, instead of having to find the spot by hand.
//
// Understands the formats Google Maps produces when you copy the address bar
// or use Share → Copy link on a full URL:
//   https://www.google.com/maps/place/Foo/@20.2961,85.8245,17z/data=!3m1!4b1!4m6!3m5!1s0x..!8m2!3d20.29611!4d85.82451
//   https://www.google.com/maps/@20.2961,85.8245,15z
//   https://www.google.com/maps?q=20.2961,85.8245      (also ll=, query=, destination=, center=)
//   https://maps.google.com/?q=20.2961,85.8245
// Short links (maps.app.goo.gl/…, goo.gl/maps/…) hide the coordinates behind
// a redirect that a browser page can't follow, so they're reported as
// { short: true } and the UI can explain what to do.

const validLat = (n) => Number.isFinite(n) && n >= -90 && n <= 90;
const validLng = (n) => Number.isFinite(n) && n >= -180 && n <= 180;

function toResult(lat, lng) {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  if (!validLat(la) || !validLng(ln)) return null;
  return { latitude: Number(la.toFixed(6)), longitude: Number(ln.toFixed(6)) };
}

const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";

export function isShortGoogleMapsLink(text) {
  return /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\b/i.test(String(text || "").trim());
}

export function looksLikeGoogleMapsLink(text) {
  const t = String(text || "").trim();
  return /^(https?:\/\/)?maps\.google\.[a-z.]+(\/|\?|$)/i.test(t) ||      // maps.google.com/?q=…
    /^(https?:\/\/)?(www\.)?google\.[a-z.]+\/maps/i.test(t) ||           // google.com/maps/…
    isShortGoogleMapsLink(t);
}

// Returns { latitude, longitude } | { short: true } | null
export function parseGoogleMapsLocation(input) {
  const text0 = String(input || "").trim();
  if (!text0) return null;

  // Plain coordinates: "20.2961, 85.8245" / "20.2961 85.8245"
  const plain = text0.match(new RegExp(`^${NUM}\\s*[,\\s]\\s*${NUM}$`));
  if (plain) return toResult(plain[1], plain[2]);

  if (isShortGoogleMapsLink(text0)) return { short: true };
  if (!looksLikeGoogleMapsLink(text0)) return null;

  let text = text0;
  try { text = decodeURIComponent(text0); } catch { /* keep raw */ }

  // 1. The pinned place itself (!3d<lat>!4d<lng>) — most accurate when present
  let m = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (m) return toResult(m[1], m[2]);
  // 2. Map viewport centre (@lat,lng,zoom)
  m = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m) return toResult(m[1], m[2]);
  // 3. Query-string forms
  m = text.match(/[?&](?:q|ll|query|destination|daddr|center|viewpoint)=\s*(-?\d+(?:\.\d+)?)\s*[,+ ]\s*(-?\d+(?:\.\d+)?)/);
  if (m) return toResult(m[1], m[2]);
  return null;
}

// A link that opens exactly this pin in Google Maps.
export function googleMapsPinUrl(latitude, longitude) {
  if (latitude == null || longitude == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
