import { supabase } from "./supabaseClient";

// ── R2 Upload Helper ──────────────────────────────────────────────────────────
// Call uploadToR2(file, folder) from any component (admin listing form, client
// avatar upload, blog cover image picker, etc). Returns the public URL to save
// into the matching Supabase column (listings.image_url, client_profiles.avatar_url, etc).

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL;

/**
 * @param {File} file - the file object from an <input type="file"> element
 * @param {"listings"|"blog"|"avatars"|"agents"} folder - which R2 folder to store under
 * @returns {Promise<{url: string, key: string} | {error: string}>}
 */
export async function uploadToR2(file, folder) {
  if (!WORKER_URL) {
    return { error: "Missing VITE_R2_WORKER_URL — check your .env file." };
  }

  if (!file) return { error: "No file provided." };

  try {
    // Get the current Supabase session token to authenticate the presign request
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: "You must be logged in to upload files." };

    // Step 1 — ask the Worker for a presigned upload URL
    const presignRes = await fetch(`${WORKER_URL}/presign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        folder,
      }),
    });

    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => ({}));
      return { error: err.error || "Failed to get upload URL." };
    }

    const { uploadUrl, publicUrl } = await presignRes.json();

    // Step 2 — upload the actual file bytes directly to R2 using that URL
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadRes.ok) {
      return { error: "Upload to storage failed. Please try again." };
    }

    return { url: publicUrl };
  } catch (err) {
    return { error: err?.message || "Network error — please check your connection and try again." };
  }
}

/**
 * Validates a file before upload — call this in onChange handlers to give
 * instant feedback instead of waiting for the Worker to reject it.
 */
export function validateImageFile(file, maxSizeMB = 5) {
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Please upload a JPEG, PNG, WebP, or AVIF image.";
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File must be smaller than ${maxSizeMB}MB.`;
  }
  return null;
}

// Same idea, for project documents (brochure, floor plans, master plan,
// specification sheet) — these upload to the "documents" R2 folder, which
// the Worker allows PDFs into (see cloudflare-worker/worker.js). Requires
// redeploying the Worker (`cd cloudflare-worker && wrangler deploy`) if it
// was deployed before this was added.
export function validateDocumentFile(file, maxSizeMB = 15) {
  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Please upload a PDF, JPEG, PNG, or WebP file.";
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File must be smaller than ${maxSizeMB}MB.`;
  }
  return null;
}

// ── Section 2G: lightweight, honest image-quality checks ──────────────────
// Real, working, entirely client-side (no API key, no network call):
//   computeImageHash()  — a perceptual dHash, for duplicate/near-duplicate detection
//   hammingDistance()   — compares two hashes; small distance = likely duplicate
//   looksLikeScreenshot() — a filename/aspect-ratio heuristic, NOT a guarantee
// Deliberately NOT implemented: watermark detection and "is this actually a
// property photo" classification — both need a real vision-ML service, which
// isn't configured anywhere in this project. Faking those checks would be
// worse than not having them; see migration_019 for the full note.

// 8x8 difference-hash: shrink to 9×8 grayscale, compare each pixel to its
// right neighbor, and stack the 64 bits into a hex string. Two photos that
// look alike (even after re-saving/light cropping) end up with hashes only
// a few bits apart — exact duplicates hash identically.
export function computeImageHash(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const w = 9, h = 8;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const gray = [];
        for (let i = 0; i < data.length; i += 4) {
          gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        let bits = "";
        for (let row = 0; row < h; row++) {
          for (let col = 0; col < w - 1; col++) {
            bits += gray[row * w + col] > gray[row * w + col + 1] ? "1" : "0";
          }
        }
        // Pack the 64-bit string into hex for compact storage/comparison.
        let hex = "";
        for (let i = 0; i < bits.length; i += 4) {
          hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
        }
        resolve(hex);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
    img.src = url;
  });
}

export function hammingDistance(hexA, hexB) {
  if (!hexA || !hexB || hexA.length !== hexB.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < hexA.length; i++) {
    let diff = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    while (diff) { distance += diff & 1; diff >>= 1; }
  }
  return distance;
}

// A heuristic, not a guarantee — flags likely phone/desktop screenshots by
// filename or by matching a handful of extremely common screen resolutions.
// Always shown as a dismissible warning in the UI, never a hard block.
export function looksLikeScreenshot(file, width, height) {
  const name = file.name.toLowerCase();
  if (/screenshot|screen[ -]?shot|snip(ping)?|scrn/.test(name)) return true;
  const COMMON_SCREEN_SIZES = [[1170, 2532], [1080, 2400], [1080, 1920], [1440, 2960], [1920, 1080], [2560, 1440], [1366, 768], [1512, 982], [2880, 1800]];
  if (width && height) {
    return COMMON_SCREEN_SIZES.some(([w, h]) => (width === w && height === h) || (width === h && height === w));
  }
  return false;
}

// Reads just the pixel dimensions of a file, for the screenshot-size heuristic.
export function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
    img.src = url;
  });
}

/**
 * Deletes one or more previously-uploaded files from R2. Pass the full public
 * URLs you got back from uploadToR2() (e.g. a listing's `images` array) — the
 * Worker converts these back into R2 object keys itself. Safe to call even if
 * a URL is missing/malformed — it's just skipped.
 * @param {string[]} publicUrls
 * @returns {Promise<{deleted: string[]} | {error: string}>}
 */
export async function deleteFromR2(publicUrls) {
  if (!WORKER_URL) return { error: "Missing VITE_R2_WORKER_URL — check your .env file." };
  if (!publicUrls || publicUrls.length === 0) return { deleted: [] };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: "You must be logged in to delete files." };

    const res = await fetch(`${WORKER_URL}/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ urls: publicUrls.filter(Boolean) }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { error: err.error || "Failed to delete file(s)." };
    }

    return await res.json();
  } catch (err) {
    return { error: err?.message || "Network error while deleting file(s)." };
  }
}
