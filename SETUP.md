# PropertyBrands — Connecting Real Listings (Supabase + Cloudflare R2)

This guide gets the public site — Search Results, Property Detail, Post
Property, and the rest — running on your real Supabase database and
Cloudflare R2 storage, instead of the bundled demo data. (The admin console
that manages this data lives in a separate project — see its own SETUP.md.)

Your project already has the plumbing for this built in (`src/lib/supabaseClient.js`,
`src/lib/r2Upload.js`, `cloudflare-worker/`). This guide just walks through wiring
it up. It looks like a Supabase project (`.env`) is already configured — if so,
skip straight to **Step 1**.

---

## Step 0 — If you're starting from scratch

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor → New Query**, paste the entire contents of `supabase/schema.sql`, and run it. This creates every table (listings, leads, agents, blog_posts, client_profiles, admin_profiles, saved_properties) with the new listing-detail columns already included. `admin_profiles` is used by the separate admin console, not this site, but it's part of the same schema/database.
3. Skip to **Step 2**.

## Step 1 — Already have a Supabase project? Run the migration

Your `listings` table exists but is missing the columns the new Property Detail
page and Admin form need (BHK, images, tags, amenities, etc).

1. Go to **Supabase Dashboard → SQL Editor → New Query**.
2. Paste the entire contents of `supabase/migration_002_listing_details.sql` and run it.
3. It's safe to run even if you're not sure — every statement is `IF NOT EXISTS`, so it only adds what's missing and never touches existing data.

Also run `supabase/migration_007_site_content.sql` the same way — it adds four tables (Partner Tiers, Client Reviews, Subscription Plans, Investment Opportunities) that back the "Site Content" section of the admin console. Until you add real rows there, the public site keeps showing its built-in demo content for these sections, same as listings do.

Then run `supabase/migration_008_seed_site_content.sql` — this copies that same built-in demo content (the tiers, reviews, plans, and investment corridors the public site was already showing) into those four tables as real rows, so the admin console shows and can edit the actual live content immediately instead of an empty list. It only inserts if a table is completely empty, so it's safe to run even if you've already added your own rows — it won't create duplicates or touch anything you've edited.

Also run `supabase/migration_009_site_settings.sql` — adds a Contact & Social settings panel (phone, email, address, social links) and an Office Locations list to the admin console, both seeded with the values the Footer/Contact Us page already showed.

Finally, run `supabase/migration_010_listing_options.sql`. This changes how listings work in a few ways:
- A listing's BHK is now a list instead of a single value, so one listing (e.g. a builder project) can be "2 BHK, 3 BHK" — existing listings' single BHK values carry over automatically.
- Property types are no longer locked to a fixed list — admins add/remove them from "Site Content" → Listing Options instead.
- Adds a Google Maps link and video links to each listing.
- Seeds a much bigger default set of property types, BHK options, amenities, and tags than the site shipped with originally.

Also run `supabase/migration_011_hero_content.sql` — makes the homepage Hero section (headline, search tabs, quick-action buttons, sidebar promo card, and the property card grid) fully admin-editable from "Site Content" → Hero Content / Hero Cards, and adds Budget Ranges as a fourth admin-editable list alongside property types/BHK/amenities/tags. Seeded with the exact content the Hero already showed, so nothing changes visually until you edit it.

Run `supabase/migration_012_listing_geolocation.sql` — adds `latitude`/`longitude` to listings so a property can have a real pinned location (an actual interactive map, not just an outbound link). Both Post Property and the admin listing form now have a click-to-pin map with address search; the property detail page shows an embedded map wherever a pin has been set. The old `google_maps_link` field is kept as an optional override for the "Get Directions" button.

Finally, run `supabase/migration_026_price_on_request.sql` — adds a `price_on_request` flag to listings. Both Post Property and the admin listing form show a "Call for Details" checkbox next to the Price field; checking it skips the numeric price entirely (no more required-field error) and shows "Call for Details" everywhere the price would normally appear — search results, property detail, saved properties, compare, and the admin listings table.

And run `supabase/migration_027_listing_brochure.sql` — adds a `brochure_url` field to listings, alongside the existing floor plan field. Post Property gets a Brochure link field; the admin listing form gets the same field plus an upload button (PDF straight to R2); the property detail page shows a "Download Brochure" button in the contact sidebar whenever one is set.

## Step 2 — Admin console

The admin console is a **separate project/deployment** (not part of this
repo) that shares this same Supabase project and R2 worker. See its own
SETUP.md for creating your first admin login and deploying it. Nothing in
this project needs to change to support it.

## Step 3 — Cloudflare R2 bucket (property photos)

If you already have `propertybrands-media` bucket set up, skip to Step 4.

1. **Cloudflare Dashboard → R2 → Create bucket** → name it (e.g. `propertybrands-media`).
2. Under the bucket's **Settings → Public Access**, enable public access (or connect a custom domain) so uploaded photos are viewable — note the public URL base, you'll need it below.
3. Create an **R2 API token** (Cloudflare Dashboard → R2 → Manage API Tokens) with read/write access to that bucket — you'll get an Access Key ID and Secret Access Key.

## Step 4 — Deploy the upload Worker

The Worker is the only thing allowed to talk to R2 directly — the browser asks it for a short-lived upload URL, never holds storage credentials itself.

```bash
cd cloudflare-worker
npm install
wrangler login          # one-time, opens a browser to authenticate

wrangler secret put R2_ACCOUNT_ID          # from Cloudflare dashboard sidebar
wrangler secret put R2_ACCESS_KEY_ID       # from Step 3
wrangler secret put R2_SECRET_ACCESS_KEY   # from Step 3
wrangler secret put R2_BUCKET_NAME         # e.g. propertybrands-media
wrangler secret put R2_PUBLIC_BASE_URL     # e.g. https://media.yourdomain.com (no trailing slash)

# This Worker is shared by both this site AND the separate admin console,
# so list every origin allowed to call it, comma-separated, no spaces:
wrangler secret put ALLOWED_ORIGINS        # e.g. https://propertybrands.in,https://admin.propertybrands.in

npm run deploy
```

This prints a URL like `https://propertybrands-r2-upload.<you>.workers.dev` — that's your `VITE_R2_WORKER_URL` (used by both this site's `.env` and the admin console's `.env`).

> This Worker now also has a `/delete` endpoint (new) — used automatically when an admin removes a photo or deletes a listing, so orphaned files don't pile up in your bucket. No extra setup needed; it reuses the same bucket binding and secrets above.

## Step 5 — Environment variables

In the project root, create/update `.env` (copy from `env.example` if starting fresh):

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key

VITE_R2_WORKER_URL=https://propertybrands-r2-upload.your-subdomain.workers.dev
```

Get the Supabase values from **Project Settings → API**. Restart `npm run dev` after editing `.env`.

---

## How it all connects

- New listings are created in the **admin console** (separate project) and written to your `listings` table via its own copy of `src/lib/listings.js`.
- Listings default to **Pending** — an admin flips the **Moderation Status** dropdown to **Live** to make them publicly visible.
- The public **Search Results** page (`/search`) automatically fetches real **Live** listings from Supabase. Until you add your first one, it shows the bundled demo dataset so the site never looks empty — the moment you have one real Live listing, it takes over automatically.
- Clicking any property card — on the homepage or in search results — opens the **Property Detail** page (image gallery, amenities, key facts, contact CTAs, similar properties), Amazon-style.
- Regular visitors can also submit their own listing via **Post Property** — it's saved as `Pending` until an admin approves it.

## Troubleshooting

- **"Couldn't load listings"** → check `.env` values and that you ran the SQL in Steps 0/1.
- **Photo upload fails (Post Property / profile avatar)** → check `VITE_R2_WORKER_URL` is set and the Worker deployed successfully (Step 4); check the Worker's secrets are all set (`wrangler secret list` from `cloudflare-worker/`), including `ALLOWED_ORIGINS` containing this site's exact origin.

And run `supabase/migration_029_plot_listing_details.sql` — adds the plot / land fields (road width, plot length and width, corner plot, boundary wall, land use, approval). Choosing the **Plot** or **Agricultural Land** type in Post Property or the admin listing form now swaps the BHK / bathroom / floor fields for plot fields (area in sq ft, sq yd, sq m, decimal or acre). The site still saves plots if this migration has not been run yet — the plot details are then kept in the description — but run it to store them as proper fields.

Also run `supabase/migration_030_duplex_type.sql` — adds **Duplex** as a property type. (The site offers Duplex even before you run it, but running it lets you manage it from the admin Listing Options screen.)

**Rent agreement emails:** the RentReady page now emails the agreement draft to the owner/tenant addresses entered. This needs the Cloudflare Worker redeployed (`wrangler deploy` in `cloudflare-worker/`) and two secrets set: `wrangler secret put RESEND_API_KEY` (a free key from resend.com) and `wrangler secret put MAIL_FROM` (e.g. `PropertyBrands <agreements@propertybrands.in>` — the domain must be verified in Resend). Optional: `MAIL_BCC` for an internal copy. Until that is set up the page tells the user the email could not be sent and offers Print / Save as PDF instead.

**Contact details:** the company phone (+91 99372 91200) is fixed in `src/lib/contactInfo.js`; the postal address is no longer shown on the site.

Also run `supabase/migration_031_rent_agreement_signing.sql` — this switches on **online review & signing for Rent Ready agreements**. After it runs, "Generate Agreement" creates a private signing link for the landlord and another for the tenant. Each person opens their own link (`https://<your-site>/#/sign/<code>`), reads the agreement, enters their Aadhaar and PAN, types their name as a signature and ticks the consent box. The links are shown on the completion screen (copy / WhatsApp) and are emailed to each party if the email worker is configured.

- **Without this migration** the link cannot be created: the completion screen says so and the printed agreement still works.
- **Emails** also need the Worker redeployed with `RESEND_API_KEY`, `MAIL_FROM` (and optionally `MAIL_BCC`) set — see Step 4 — and `VITE_R2_WORKER_URL` set on the site. If email is not set up, the completion screen still shows both links to copy/share by hand.
- **What the Aadhaar / PAN check does:** it checks the *format* (Aadhaar's 12-digit checksum, PAN's 10-character pattern). It is **not** an official UIDAI / Income Tax verification. Only the last 4 digits of Aadhaar are stored; the PAN is stored and readable by admins only.
- **Signing is an electronic acknowledgement** (typed name + consent + time + IP). It is not an Aadhaar eSign / DSC signature; for stamp-paper registration the printed copy is still needed.
- To see signed agreements: Supabase → Table Editor → `rent_agreements` (status, who signed, when, Aadhaar last 4, PAN).

Also run `supabase/migration_032_unit_sizes_handover_trend_contact.sql` — adds:
- **Several sizes in one project** (e.g. 2 BHK 1,050 sq ft and 3 BHK 1,450 sq ft, each with its own price) — shown as a table on the property page, as a size range on the cards, and matched by the budget filter if *any* size fits.
- **Handover timeline** (month + notes) in the project description.
- **Price trend** for the location (₹ per sq ft by year) as a small chart. The figures are whatever the lister/admin types in — the site does not fetch market data — so label them as indicative.
- **Private contact number**: Post Property now asks for a 10-digit number. It is stored in its own table, `listing_contacts`, readable only by the person who posted and by admins, and is shown in the admin Listings table ("Contact" column) and at the top of the edit form so you can call before approving. It is never part of the public listing data.

Without this migration the site still works: sizes and handover are kept in the description text, the trend is not saved, and the contact number is not stored (the listing is still submitted).
