// Which categories of notifications show up in the bell icon — saved per
// device/browser (localStorage), since there's no per-admin settings table
// yet. Used by AdminSettings.jsx (the toggles) and lib/notifications.js
// (which categories to actually fetch/show).

const KEY = "pb_admin_notification_prefs";
const DEFAULTS = { leads: true, agents: true, listings: true };

export function getNotificationPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setNotificationPrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Private browsing / storage disabled — preferences just won't persist.
  }
}
