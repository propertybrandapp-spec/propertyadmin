import { useState, useEffect, useCallback } from "react";
import { fetchNotifications, formatRelativeTime } from "../../lib/notifications";

// URL of the public marketing site — set VITE_MAIN_SITE_URL in .env.
// Falls back to "/" (old same-domain behavior) if it's not configured.
const MAIN_SITE_URL = import.meta.env.VITE_MAIN_SITE_URL || "/";

// ── Nav Items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: "listings",
    label: "Property Listings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: "leads",
    label: "Leads & Inquiries",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "agents",
    label: "Agents & Partners",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "blog",
    label: "Blog & Content",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: "users",
    label: "Users & Roles",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ activePage, onNavigate, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col transition-all duration-300 shrink-0
          ${collapsed ? "w-20" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "#FFFFFF", borderRight: "1px solid #E5E8EB" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 shrink-0" style={{ borderBottom: "1px solid #E5E8EB" }}>
          {!collapsed && (
            <span className="font-extrabold text-lg tracking-tight" style={{ color: "#15191C" }}>
              property<span style={{ color: "#2C9DD5" }}>Brands</span>
            </span>
          )}
          {collapsed && (
            <span className="font-extrabold text-lg mx-auto" style={{ color: "#2C9DD5" }}>pB</span>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: "#495057" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Admin badge */}
        {!collapsed && (
          <div className="px-5 pt-4 pb-2">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: "#EAF4FB", color: "#2C9DD5", border: "1px solid #2C9DD5" }}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 1L3 5v6c0 5 3.5 7.5 7 9 3.5-1.5 7-4 7-9V5l-7-4zm0 2.2l5 2.86v4.94c0 3.7-2.5 5.7-5 6.9-2.5-1.2-5-3.2-5-6.9V6.06l5-2.86z" />
              </svg>
              Admin Console
            </span>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {NAV_ITEMS.map((item) => {
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${collapsed ? "justify-center" : ""}`}
                style={{
                  background: active ? "#2C9DD5" : "transparent",
                  color: active ? "#FFFFFF" : "#495057",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#F2F4F6"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                title={collapsed ? item.label : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Return to main site */}
        <div className="p-3" style={{ borderTop: "1px solid #E5E8EB" }}>
          <a
            href={MAIN_SITE_URL}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${collapsed ? "justify-center" : ""}`}
            style={{ color: "#495057" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#F2F4F6"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            title={collapsed ? "Return to Main Site" : undefined}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {!collapsed && <span className="truncate">Return to Main Site</span>}
          </a>
        </div>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block p-3 pt-0" style={{ borderTop: "1px solid #E5E8EB" }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{ color: "#495057", background: "#F2F4F6" }}
          >
            <svg
              className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ title, subtitle, onMenuClick, onLogout, onNavigate, adminProfile }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
  // Read state is session-only (kept in memory, not persisted) — there's no
  // notifications table yet to store per-admin read receipts in. Resets on
  // page reload; see lib/notifications.js for the tradeoffs.
  const [readIds, setReadIds] = useState(new Set());

  const initials = adminProfile?.avatar_initials || adminProfile?.full_name?.charAt(0) || "A";
  const displayName = adminProfile?.full_name || "Admin";

  const loadNotifications = useCallback(async () => {
    const items = await fetchNotifications();
    setNotifications(items);
    setNotifLoading(false);
  }, []);

  useEffect(() => {
    loadNotifications();
    // Refresh in the background every 60s so the badge count stays current
    // even if the admin never closes the tab.
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  function openNotifications() {
    setNotifOpen((open) => !open);
    setProfileOpen(false);
  }

  function handleNotificationClick(n) {
    setReadIds((prev) => new Set(prev).add(n.id));
    setNotifOpen(false);
    if (n.page) onNavigate?.(n.page);
  }

  function markAllRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  function goTo(page) {
    setProfileOpen(false);
    onNavigate?.(page);
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-4 h-16 px-5 lg:px-8 shrink-0"
      style={{ background: "#FFFFFF", borderBottom: "1px solid #E5E8EB" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg shrink-0"
          style={{ color: "#15191C", background: "#F2F4F6" }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-base lg:text-lg font-bold truncate" style={{ color: "#15191C" }}>{title}</h1>
          {subtitle && <p className="text-xs truncate" style={{ color: "#495057" }}>{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-3 shrink-0">
        {/* Search (desktop) */}
        <div
          className="hidden md:flex items-center gap-2 rounded-xl px-3 py-2 w-56"
          style={{ background: "#F2F4F6", border: "1px solid #E5E8EB" }}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "#495057" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            className="flex-1 text-sm bg-transparent focus:outline-none"
            style={{ color: "#15191C" }}
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={openNotifications}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
            style={{ background: "#F2F4F6" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" style={{ color: "#15191C" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: "#BA0D0B", color: "#FFFFFF" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden"
              style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}
            >
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E8EB" }}>
                <p className="text-sm font-bold" style={{ color: "#15191C" }}>Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-semibold" style={{ color: "#2C9DD5" }}>
                    Mark all read
                  </button>
                )}
              </div>
              {notifLoading ? (
                <p className="px-4 py-6 text-xs text-center" style={{ color: "#495057" }}>Loading...</p>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-6 text-xs text-center" style={{ color: "#495057" }}>You're all caught up.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((n, i) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className="block w-full text-left px-4 py-3 text-xs transition-colors"
                      style={{
                        borderBottom: i < notifications.length - 1 ? "1px solid #E5E8EB" : "none",
                        background: readIds.has(n.id) ? "transparent" : "#EAF4FB",
                      }}
                    >
                      <p style={{ color: "#15191C" }}>{n.text}</p>
                      <p className="mt-1" style={{ color: "#495057" }}>{formatRelativeTime(n.time)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 pl-1 pr-2 lg:pr-3 py-1 rounded-xl transition-colors"
            style={{ background: "#F2F4F6" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "#2C9DD5", color: "#FFFFFF" }}
            >
              {initials}
            </div>
            <span className="hidden lg:block text-sm font-semibold" style={{ color: "#15191C" }}>{displayName}</span>
            <svg className="hidden lg:block w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" style={{ color: "#495057" }}>
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {profileOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
              style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}
            >
              {[
                { label: "My Profile", page: "profile" },
                { label: "Settings", page: "settings" },
                { label: "Help & Support", page: "help" },
              ].map(({ label, page }) => (
                <button
                  key={page}
                  onClick={() => goTo(page)}
                  className="block w-full text-left px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "#15191C" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#F2F4F6"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  {label}
                </button>
              ))}
              <div style={{ borderTop: "1px solid #E5E8EB" }} />
              <button
                onClick={() => { setProfileOpen(false); onLogout && onLogout(); }}
                className="block w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors"
                style={{ color: "#BA0D0B" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#FCEAEA"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function AdminLayout({ activePage, onNavigate, title, subtitle, children, onLogout, adminProfile }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: "#F7F8FA" }}>
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} onMenuClick={() => setMobileOpen(true)} onLogout={onLogout} onNavigate={onNavigate} adminProfile={adminProfile} />
        <main className="flex-1 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
