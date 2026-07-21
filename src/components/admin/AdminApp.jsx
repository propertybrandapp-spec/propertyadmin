import { useState, useEffect } from "react";
import { supabase, safeQuery } from "../../lib/supabaseClient";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import AdminListings from "./AdminListings";
import AdminListingForm from "./AdminListingForm";
import AdminBlog from "./AdminBlog";
import AdminBlogForm from "./AdminBlogForm";
import AdminUsers from "./AdminUsers";
import AdminLeads from "./AdminLeads";
import AdminAgents from "./AdminAgents";

// ── Main Export ───────────────────────────────────────────────────────────────
// This is the single entry point for the entire /admin area. It:
//   1. Checks if a Supabase session already exists (so refresh doesn't log you out)
//   2. Shows AdminLogin if not authenticated
//   3. Shows the requested admin page if authenticated
//
// Mount this from App.jsx when the public router's page === "admin"
// (see App.jsx wiring instructions in the chat response).

export default function AdminApp() {
  const [session, setSession] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [navPayload, setNavPayload] = useState(null);

  // Second arg is optional — used by "listings-form" to know whether it's
  // editing an existing listing (payload = the listing object) or creating
  // a new one (payload = null).
  function adminNavigate(pageId, payload) {
    setActivePage(pageId);
    setNavPayload(payload || null);
  }

  useEffect(() => {
    // Check for an existing session on mount
    safeQuery(supabase.auth.getSession()).then(async ({ data }) => {
      const session = data?.session || null;
      if (session) {
        const { data: profile } = await safeQuery(
          supabase.from("admin_profiles").select("*").eq("id", session.user.id).single()
        );
        if (profile) {
          setSession(session);
          setAdminProfile(profile);
        }
      }
      setLoading(false);
    });

    // Listen for sign-out events (e.g. session expiry) anywhere in the app
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setSession(null);
        setAdminProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  function handleLoginSuccess(profile) {
    setAdminProfile(profile);
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setAdminProfile(null);
  }

  // ── Loading state ── (prevents login-page flash while checking session)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F8FA" }}>
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "#2C9DD5" }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="text-sm" style={{ color: "#495057" }}>Loading admin console...</span>
        </div>
      </div>
    );
  }

  // ── Not authenticated ──
  if (!session || !adminProfile) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // ── Authenticated — route to the requested admin page ──
  const pageProps = { onNavigate: adminNavigate, adminProfile, onLogout: handleLogout };

  switch (activePage) {
    case "dashboard":
      return <AdminDashboard {...pageProps} />;
    case "listings":
      return <AdminListings {...pageProps} />;
    case "listings-form":
      return <AdminListingForm {...pageProps} editingListing={navPayload} />;
    case "leads":
      return <AdminLeads {...pageProps} />;
    case "agents":
      return <AdminAgents {...pageProps} />;
    case "blog":
      return <AdminBlog {...pageProps} />;
    case "blog-form":
      return <AdminBlogForm {...pageProps} editingListing={navPayload} />;
    case "users":
      return <AdminUsers {...pageProps} />;
    default:
      return <AdminDashboard {...pageProps} />;
  }
}
