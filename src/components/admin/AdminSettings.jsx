import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { getNotificationPrefs, setNotificationPrefs } from "../../lib/notificationPrefs";

const NOTIF_OPTIONS = [
  { key: "leads", label: "New leads & inquiries" },
  { key: "agents", label: "Agent verification requests" },
  { key: "listings", label: "Listings pending approval" },
];

export default function AdminSettings({ onNavigate, onLogout, adminProfile }) {
  const [prefs, setPrefs] = useState(getNotificationPrefs());
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState(null);

  function togglePref(key) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setNotificationPrefs(next);
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwMessage(null);

    if (newPassword.length < 8) {
      setPwMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "Passwords don't match." });
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) {
      setPwMessage({ type: "error", text: error.message || "Couldn't update password." });
    } else {
      setPwMessage({ type: "success", text: "Password updated." });
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <AdminLayout
      activePage="settings"
      onNavigate={onNavigate}
      onLogout={onLogout}
      adminProfile={adminProfile}
      title="Settings"
      subtitle="Security and notification preferences"
    >
      <div className="max-w-lg space-y-5">
        {/* Password */}
        <form onSubmit={handlePasswordChange} className="rounded-2xl p-6 space-y-4" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
          <h2 className="text-sm font-bold" style={{ color: "#15191C" }}>Change password</h2>

          {pwMessage && (
            <div
              className="px-3 py-2 rounded-lg text-xs font-semibold"
              style={{
                background: pwMessage.type === "success" ? "#EAF8EC" : "#FCEAEA",
                color: pwMessage.type === "success" ? "#1c7c3f" : "#BA0D0B",
              }}
            >
              {pwMessage.text}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#495057" }}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg focus:outline-none"
              style={{ border: "1px solid #E5E8EB", color: "#15191C" }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#495057" }}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg focus:outline-none"
              style={{ border: "1px solid #E5E8EB", color: "#15191C" }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="text-sm font-bold px-4 py-2.5 rounded-xl"
            style={{ background: "#2C9DD5", color: "#FFFFFF", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Updating..." : "Update password"}
          </button>
        </form>

        {/* Notification preferences */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "#15191C" }}>Notification preferences</h2>
            <p className="text-xs mt-1" style={{ color: "#495057" }}>Choose which alerts show up in the bell icon at the top of the console.</p>
          </div>
          <div className="space-y-3">
            {NOTIF_OPTIONS.map((item) => (
              <label key={item.key} className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm" style={{ color: "#15191C" }}>{item.label}</span>
                <input
                  type="checkbox"
                  checked={prefs[item.key]}
                  onChange={() => togglePref(item.key)}
                  className="w-4 h-4"
                  style={{ accentColor: "#2C9DD5" }}
                />
              </label>
            ))}
          </div>
          <p className="text-[11px]" style={{ color: "#495057" }}>Saved on this device/browser only.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
