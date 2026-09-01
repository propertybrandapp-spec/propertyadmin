import { createClient } from "@supabase/supabase-js";

// ── Supabase Client ───────────────────────────────────────────────────────────
// Pulls credentials from environment variables. Never hardcode these.
// Create a .env file in your project root (see .env.example) with:
//   VITE_SUPABASE_URL=https://your-project.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-public-key
//
// The anon key is safe to expose in frontend code — it only grants access
// permitted by your Row Level Security (RLS) policies (see SQL schema file).

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Safe query wrapper ────────────────────────────────────────────────────────
// supabase-js resolves with { data, error } for normal DB/RLS errors, but a
// transport-level failure (offline, DNS failure, misconfigured URL, Supabase
// outage — or, commonly, just a slow/flaky first connection right after the
// page opens) makes the underlying fetch() reject instead — which, left
// unhandled, turns into an unhandled promise rejection and leaves whatever
// page was loading stuck in its loading state forever, with nothing telling
// it to try again. Every data-layer function in src/lib wraps its query in
// this so a failure always resolves to a normal { data: null, error } shape
// that callers already know how to handle, AND so a transient hiccup — the
// classic "works after I refresh the page" symptom — gets silently retried
// instead of giving up on the very first attempt.
//
// The retry budget here (up to ~30s total) is deliberately generous: a
// Supabase project on the free tier "pauses" after a period of inactivity,
// and the very first request after that can take much longer than a normal
// query to wake it back up — often several seconds, occasionally more. A
// couple of quick retries isn't enough to ride that out; this is.
//
// `builder` is a Supabase query object, not a plain Promise — but it's
// "thenable" (implements .then, same as supabase.auth.getSession()), so
// `await builder` triggers it fresh each time, same as the original
// single-attempt version of this function did; repeating that per retry is
// safe and re-issues the actual request each time.
export async function safeQuery(builder, retries = 5, delayMs = 800) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await builder;
    } catch (err) {
      if (attempt >= retries) {
        return { data: null, error: { message: err?.message || "Network error — please check your connection." } };
      }
      // Exponential-ish backoff, capped at 8s per wait — patient enough for
      // a cold-starting database without leaving a single retry hanging too
      // long if the problem is actually persistent (offline, bad URL, etc.).
      await new Promise((r) => setTimeout(r, Math.min(delayMs * Math.pow(1.6, attempt), 8000)));
    }
  }
}
