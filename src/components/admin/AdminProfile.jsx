import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { updateOwnProfile } from "../../lib/adminUsers";

const ROLE_LABELS = { super_admin: "Super Admin", admin: "Admin", staff: "Staff" };

export default function AdminProfile({ onNavigate, onLogout, adminProfile, onProfileUpdated }) {
  const [fullName, setFullName] = useState(adminProfile?.full_name || "");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "success" | "error", text }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data?.user?.email || ""));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { data, error } = await updateOwnProfile(adminProfile.id, { full_name: fullName });

    setSaving(false);
    if (error) {
      setMessage({
        type: "error",
        text: "Couldn't save — you may not have permission to edit your own profile. Ask a Super Admin for help.",
      });
    } else {
      setMessage({ type: "success", text: "Profile updated." });
      onProfileUpdated?.(data);
    }
  }

  return (
    <AdminLayout
      activePage="profile"
      onNavigate={onNavigate}
      onLogout={onLogout}
      adminProfile={adminProfile}
      title="My Profile"
      subtitle="Your account details"
    >
      <div className="max-w-lg space-y-5">
        {/* Identity card */}
        <div className="rounded-2xl p-6 flex items-center gap-4" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
            style={{ background: "#2C9DD5", color: "#FFFFFF" }}
          >
            {adminProfile?.avatar_initials || adminProfile?.full_name?.charAt(0) || "A"}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold truncate" style={{ color: "#15191C" }}>{adminProfile?.full_name}</p>
            <p className="text-xs" style={{ color: "#495057" }}>{ROLE_LABELS[adminProfile?.role] || adminProfile?.role}</p>
          </div>
        </div>

        {/* Editable details */}
        <form onSubmit={handleSave} className="rounded-2xl p-6 space-y-4" style={{ background: "#FFFFFF", border: "1px solid #E5E8EB" }}>
          <h2 className="text-sm font-bold" style={{ color: "#15191C" }}>Account details</h2>

          {message && (
            <div
              className="px-3 py-2 rounded-lg text-xs font-semibold"
              style={{
                background: message.type === "success" ? "#EAF8EC" : "#FCEAEA",
                color: message.type === "success" ? "#1c7c3f" : "#BA0D0B",
              }}
            >
              {message.text}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#495057" }}>Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg focus:outline-none"
              style={{ border: "1px solid #E5E8EB", color: "#15191C" }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#495057" }}>Email</label>
            <input
              type="text"
              value={email}
              disabled
              className="w-full text-sm px-3 py-2.5 rounded-lg"
              style={{ border: "1px solid #E5E8EB", color: "#495057", background: "#F7F8FA" }}
            />
            <p className="text-[11px] mt-1" style={{ color: "#495057" }}>Contact a Super Admin to change your login email.</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="text-sm font-bold px-4 py-2.5 rounded-xl"
            style={{ background: "#2C9DD5", color: "#FFFFFF", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>

        <p className="text-xs" style={{ color: "#495057" }}>
          Need to change your password? Go to{" "}
          <button onClick={() => onNavigate("settings")} className="font-semibold" style={{ color: "#2C9DD5" }}>
            Settings
          </button>.
        </p>
      </div>
    </AdminLayout>
  );
}
