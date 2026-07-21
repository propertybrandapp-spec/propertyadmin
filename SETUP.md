# PropertyBrands — Admin Console Setup

This is the admin console for PropertyBrands, split out into its own
project so it can be deployed, secured, and scaled independently from the
public site. It talks to the **same Supabase project** and the **same
Cloudflare R2 upload Worker** as the public site — there's no separate
backend to stand up.

If the public site is already up and running with its own `.env`
configured, you already have almost everything you need — just reuse those
same Supabase values here (Step 2) and you're mostly done.

---

## Step 0 — Prerequisite: the public site's Supabase schema

This project does **not** include `supabase/schema.sql` or the migrations —
they live in the main/public site's repo and only need to be run **once**
against your Supabase project (running them here too would just be a
duplicate, and admins and public visitors share the same database).

If you haven't already run them there, do that first — see the main
repo's `SETUP.md`, Steps 0–1.

## Step 1 — Create your first admin login

1. **Supabase Dashboard → Authentication → Users → Add User** — create a user with your email/password.
2. Copy that user's **UUID** (shown in the users table).
3. **SQL Editor → New Query**, run:
   ```sql
   insert into public.admin_profiles (id, full_name, role)
   values ('paste-the-uuid-here', 'Your Name', 'super_admin');
   ```
4. You can now sign in with that email/password once this project is running (Step 3).

A Supabase auth user alone isn't enough — `AdminLogin.jsx` also checks for
a matching `admin_profiles` row, so both are required.

## Step 2 — Environment variables

Copy `env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key

VITE_R2_WORKER_URL=https://propertybrands-r2-upload.your-subdomain.workers.dev

VITE_MAIN_SITE_URL=https://propertybrands.in
```

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — **the exact same values**
  as the public site's `.env` (Project Settings → API). Same project, same
  keys — the anon key is safe to expose either way; access is enforced by
  Row Level Security, not by which frontend holds the key.
- `VITE_R2_WORKER_URL` — the exact same Worker URL the public site uses for
  photo uploads (see the main repo's `cloudflare-worker/`).
- `VITE_MAIN_SITE_URL` — the public site's live URL, used only for the
  "Return to main site" links in the login screen and sidebar.

## Step 3 — Make sure the shared upload Worker allows this origin

The R2 upload Worker (in the main site's repo, `cloudflare-worker/`) checks
the request's `Origin` header against an allow-list before it'll issue a
presigned upload URL. Since this admin console now runs on its own
domain, that domain has to be added to the Worker's `ALLOWED_ORIGINS`
secret, comma-separated with the public site's:

```bash
cd ../propertybrand/cloudflare-worker    # wherever the main site's repo is
wrangler secret put ALLOWED_ORIGINS
# e.g. https://propertybrands.in,https://admin.propertybrands.in
npm run deploy
```

Skip this and photo uploads from `AdminListingForm` / `AdminBlogForm` will
fail with a CORS error once this console is live on its own domain.

## Step 4 — Run it locally

```bash
npm install
npm run dev
```

## Step 5 — Deploy

This project deploys as its **own** Cloudflare Worker (Workers assets /
SPA), separate from the public site's Worker:

```bash
npm run deploy
```

This builds and runs `wrangler deploy` using the `propertybrands-admin`
Worker name from `wrangler.jsonc`, printing a URL like
`https://propertybrands-admin.<your-subdomain>.workers.dev`.

**Recommended:** attach a proper subdomain instead of using the raw
`workers.dev` URL — Cloudflare Dashboard → Workers & Pages →
`propertybrands-admin` → **Custom Domains** → add e.g.
`admin.propertybrands.in`. Whatever URL you end up on, make sure it's
included in Step 3's `ALLOWED_ORIGINS`.

**Optional, but worth it for an admin panel:** put this Worker behind
[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
(Zero Trust) for an extra login wall in front of the app itself — since
this console now has its own public hostname, Access adds a second layer
beyond the Supabase login.

---

## Troubleshooting

- **"Couldn't load listings/leads/etc."** → check `.env` values match the public site's Supabase project exactly.
- **Photo upload fails** → check `VITE_R2_WORKER_URL` is set, and that this console's deployed origin is in the Worker's `ALLOWED_ORIGINS` secret (Step 3).
- **Logged in but still shows the login screen** → the Supabase user needs a matching `admin_profiles` row — see Step 1.
- **"Return to main site" goes to the wrong place** → set `VITE_MAIN_SITE_URL` in `.env` and rebuild/redeploy.
