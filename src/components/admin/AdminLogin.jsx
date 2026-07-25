import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// URL of the public marketing site — set VITE_MAIN_SITE_URL in .env.
// Falls back to "/" (old same-domain behavior) if it's not configured.
const MAIN_SITE_URL = import.meta.env.VITE_MAIN_SITE_URL || "/";

export default function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Confirm this user actually has an admin_profiles row (i.e. is an admin,
      // not just any Supabase auth user — important since auth and admin
      // authorization are two separate concerns).
      const { data: profile, error: profileError } = await supabase
        .from("admin_profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setError("This account does not have admin access.");
        await supabase.auth.signOut();
        return;
      }

      onLoginSuccess(profile);
    } catch (err) {
      setError(err?.message || "Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F8FAFC" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-extrabold text-2xl tracking-tight" style={{ color: "#1F2937" }}>
            property<span style={{ color: "#1E88E5" }}>Brands</span>
          </span>
          <p className="text-sm mt-2" style={{ color: "#6B7280" }}>Admin Console</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 20px 40px rgba(31,41,55,0.08)" }}>
          <h1 className="text-xl font-bold mb-1" style={{ color: "#1F2937" }}>Sign in</h1>
          <p className="text-sm mb-6" style={{ color: "#6B7280" }}>Enter your admin credentials to continue.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "#1F2937" }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@propertybrands.in"
                className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition"
                style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0", color: "#1F2937" }}
                onFocus={(e) => e.target.style.borderColor = "#1E88E5"}
                onBlur={(e) => e.target.style.borderColor = "#E2E8F0"}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "#1F2937" }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition"
                style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0", color: "#1F2937" }}
                onFocus={(e) => e.target.style.borderColor = "#1E88E5"}
                onBlur={(e) => e.target.style.borderColor = "#E2E8F0"}
              />
            </div>

            {error && (
              <div className="text-sm rounded-xl px-4 py-3" style={{ background: "#FEE2E2", color: "#DC2626" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: loading ? "#1565C0" : "#1E88E5", color: "#FFFFFF", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#6B7280" }}>
          Not an admin? <a href={MAIN_SITE_URL} className="font-semibold" style={{ color: "#1E88E5" }}>Return to main site</a>
        </p>
      </div>
    </div>
  );
}
