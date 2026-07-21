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
// outage) makes the underlying fetch() reject instead — which, left
// unhandled, turns into an unhandled promise rejection and leaves whatever
// page was loading stuck in its loading state forever. Every data-layer
// function in src/lib wraps its query in this so a failure always resolves
// to a normal { data: null, error } shape that callers already know how to
// handle (show an error/empty state) instead of hanging indefinitely.
export async function safeQuery(builder) {
  try {
    return await builder;
  } catch (err) {
    return { data: null, error: { message: err?.message || "Network error — please check your connection." } };
  }
}
