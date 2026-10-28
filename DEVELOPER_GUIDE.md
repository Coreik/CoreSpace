# CoreSpace website: developer guide

CoreSpace renovates apartment bathrooms in Bengaluru. This repo holds the whole website as **one file, `index.html`**: inline CSS and JavaScript, no framework, no build step. This guide explains how it is put together, how to change it safely, and what is still unfinished.

| | |
|---|---|
| Live (new) site | https://claude.ai/artifact/RmLXKgzB6YpUE9L3sa5eHu (a claude.ai Artifact, private until shared) |
| Old site (unchanged) | https://claude.ai/artifact/XrBtkg6vGvBdXV3xAKzNzS |
| Branch | `claude/sweet-lovelace-gowmpq` |
| Baseline commit (old site, untouched) | `5c421b0` |

---

## 1. Run it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/index.html. Opening the file directly (`file://`) also works.

Locally, everything works except the features that need the claude.ai runtime (`window.claude`), which the page detects and switches off on its own:

| Feature | Needs | Locally |
|---|---|---|
| Profiles (My account) | `db` + `user` | Shows a "sign in" notice |
| Team dashboard (`#admin`): leads, customers, prices, bookings switch | `db` + `user` (editor) | Shows an access notice |
| Booking/lead saving | `db` | Falls back to "Send on WhatsApp" |
| Photo quote matching | `sample` (images) | Falls back to WhatsApp |
| PDF download of an estimate | `downloads` + jsPDF from cdnjs | Button hidden |

Everything else (shop, packages, designs, My bathrooms, estimator, WhatsApp links) runs fully offline and saves to `localStorage`.

---

## 2. Where things are in `index.html`

The file's first line and last line are the claude.ai page skeleton (`<!doctype html>…<body>` and `</body></html>`). Keep them in the repo copy, and strip them when publishing (see section 9).

Every block in the script starts with a banner comment, so search for the banner rather than a line number:

| Banner | What it holds |
|---|---|
| `<style>` (top of file) | Design tokens on `:root`, then component CSS. New shop/design CSS is at the end of the style block, starting at `/* Bathroom shop, packages and project */` |
| `/* ============ CATALOG (edit by hand) ============ */` | `WHATSAPP_NUMBER` and the `CATALOG` object: brands, categories, products, packages and looks. **Most business edits happen here.** |
| `/* ============ SITE DATA ============ */` | Contact details (`CO`), service areas, payment split, the Corebath job definition (`JOBS.bathroom`: tier prices, sizes, add-ons, FAQ) and icons |
| `/* ============ CATALOG LOOKUPS AND PRICING ============ */` | Lookup maps, price ranges, sizes, **service rates (`SERVICES`)**, tile quantity maths |
| `/* ============ PROJECT: … ============ */` | The multi-bathroom "cart": data model, save/load, checklist, WhatsApp text |
| `/* ============ STATE ============ */` | Estimator state and `tierPrice()` (reads admin price overrides) |
| `/* ============ RENDER HELPERS ============ */` | Routes list, nav, footer links, sheets (slide-in panels), phone menu |
| `/* ============ PAGES ============ */` | Home, bathroom package page + estimator, How it works, Projects, About, Book, Terms |
| `/* ============ SHOP ============ */`, `PACKAGES`, `MY BATHROOMS`, `DESIGNS` | The new shopping features |
| `/* ============ ADMIN ============ */` | Team dashboard |
| `/* ============ CAPABILITIES ============ */` | Connects to the claude.ai runtime (`db`, `user`, `downloads`, `sample`) |
| `/* ============ ROUTER ============ */` | `currentRoute()` and `render()` |
| `/* ============ EVENTS ============ */` | One delegated `click`, `change`, `input` and `submit` handler for the whole site, keyed on `data-act` attributes |

### How rendering works

- Every page is a function that returns an HTML string (`pageHome()`, `pageShop()` …). `render()` picks one from the URL hash and puts it into `<main id="page">`.
- Interactive parts redraw only themselves: `drawShop()`, `drawPackages()`, `drawSwitcher()` and `drawBaths()`.
- All clicks go through one listener. A button declares what it does with `data-act="…"` plus `data-id`, `data-b` (bathroom id), `data-i` (item index) or `data-k`. To add behaviour, add a `data-act` value and a branch in the `click` handler.
- `keepFocus(fn)` redraws and puts keyboard focus back on the same control. Use it whenever you redraw something the user just clicked.
- Always pass user text through `esc()` before putting it in HTML.

---

## 3. Routes

| Hash | Page |
|---|---|
| `#home` (or empty or unknown) | Home |
| `#bathroom` | Corebath packages (Essential / Signature / Luxe) + price estimator + booking form. **This is the main path.** |
| `#designs` | Gallery of designed looks |
| `#look-<id>` (e.g. `#look-filter-coffee`) | One look: drawing, finish list, price for chosen size, "Make it mine" |
| `#shop` | Product shop (sticky bathroom + category bar), then packages by brand (`#packages` section) |
| `#my-bathrooms` | Full-page view of the customer's bathrooms (also opens as a side panel from the cart icon) |
| `#photo` | Photo quote |
| `#process`, `#projects`, `#about`, `#book`, `#terms` | Content pages |
| `#account` | Customer profile (needs claude.ai) |
| `#admin` | Team dashboard (needs an editor account on claude.ai) |
| `#kits` | Old route, redirects to `#shop` packages |
| `#kitchen`, `#flooring`, `#ceiling`, `#wardrobe`, `#more`, … | Removed services; fall back to Home |

Only plain `#name` hashes work on claude.ai (no `#/path`, no query strings).

---

## 4. The catalogue (`CATALOG`)

Everything for sale lives in one object so the business can edit it by hand.

### brands

```js
{ id:"jaquar", name:"Jaquar", kind:"fittings", priceClass:"mid", range:"…" }
```

`kind` is `fittings` (the 7 brands with packages: Jaquar, Kohler, Cera, Hindware, Parryware, Grohe, Hansgrohe), `tiles` (Kajaria, Somany, Orientbell) or `picks` (unbranded "CoreSpace pick" items). Package tabs, the compare table and the home brand strip only show `fittings` brands.

### categories

There are 9: tiles, sanitaryware, flushing, faucets, showers, health faucet & fittings, drainage, accessories, extras. Each has `subcategories`, which drive filtering, swapping and the essentials checklist.

### products (187)

```js
{
  id: "jaquar-mixer",            // stable id, used in saved bathrooms; never rename
  code: "CS-JAQ-BMX-01",         // CoreSpace code shown to customers: CS-<brand>-<type>-<nn>
  brand: "jaquar",
  category: "faucets", subcategory: "basin-mixer",
  name: "Single-lever basin mixer",
  modelCode: "TBC",              // brand's own model number; "TBC" shows "Confirmed in your quote"
  finish: "Chrome",
  unit: "sqft",                  // only on tiles; otherwise absent (= each)
  priceMRP: 4850,                // exact rate, or null
  priceStatus: "site-rate",      // "site-rate" = exact CoreSpace list rate; "indicative" = estimate
  priceRange: [5000, 9000],      // used only when priceMRP is null
  includesPlate: true,           // optional: cistern already includes flush plate
  includesSeat: true,            // optional: WC already includes soft-close seat
  image: null, notes: "…"
}
```

**To set a real price:** set `priceMRP` to a number and `priceStatus` to `"site-rate"`. The site then shows that exact price everywhere: cards, packages, looks, totals and WhatsApp.

**To add a product:** copy a line, give it a new unique `id` and `code`, and pick an existing `subcategory`. It appears in the shop, search and swaps automatically.

**Never change an `id`** that is already live. Customers' saved bathrooms store product ids, and unknown ids are silently dropped on load.

Current state: **57 products use exact CoreSpace rates** (49 fittings + 8 tiles, all from the old site's price list). **130 still show an estimated range** (all of Kohler and Hansgrohe, most of Hindware and Parryware, some generic items). Every brand `modelCode` is still `TBC`.

### packages (21)

```js
{ id:"jaquar-signature", brand:"jaquar", tier:"signature", name:"Jaquar Signature",
  fittings:"jaquar", ceramics:"jaquar", popular:true, summary:"…",
  items:[ ["jaquar-wc-wall",1], ["jaquar-angle",2], … ] }   // [productId, qty]
```

There are 3 tiers × 7 brands. Hansgrohe packages use Kohler ceramics (`ceramics:"kohler"`).

### looks (6, the Designs page)

```js
{ id:"filter-coffee", name:"Filter Coffee", designer:"CoreSpace Studio", tier:"signature", brand:"jaquar",
  tagline:"…", story:"…",
  palette:{ wall:"#E9DCC8", floor:"#9A5B3A", feature:"#C27C4E", featureStyle:"panel", wood:"#B07A4F", metal:"#AEB3B7", wallTile:[300,600] },
  image:null,                    // set to "img/look-filter-coffee.jpg" once a render is published
  items:[ ["kajaria-floor-tile-1","floor","Terracotta brown, matte"],   // tile qty: "floor" | "wall" | "feature"
          ["jaquar-wc-wall",1,""], … ] }                                // [productId, qty, finish note]
```

- **Tile quantities** are worked out from the bathroom size by `tileQty()`: floor area × 1.1, wall area to 8 ft minus a door (17.5 sq ft) × 1.1, and the feature wall (the short wall × 8 ft) × 1.1, rounded up to 10 sq ft.
- **Pictures:** while `image` is null, the page draws a concept elevation from `palette` (`lookArt()`). Once `image` is set, it shows the photo instead.
- **`featureStyle`** is `panel`, `fluted`, `band` or `null`.

---

## 5. Pricing

- **Product price:** `pRange(p)` returns `[low, high]`. It equals `[priceMRP, priceMRP]` when a rate is set, otherwise `priceRange`. All totals are ranges and collapse to a single figure when everything is exact.
- **Services** (`SERVICES` in "CATALOG LOOKUPS AND PRICING") are **placeholders the business has not confirmed yet**:

  | Service | Current estimate |
  |---|---|
  | Installation and plumbing | ₹24,000–38,000 for 40 sq ft, plus ₹300–450 per extra sq ft |
  | Waterproofing | ₹160–260 per sq ft of membrane area |
  | Tiling (laying only) | ₹55–85 per sq ft of tiled area |

  Replace the `r:` functions with the owner's real rates when they arrive. Results are rounded to ₹500.
- **Sizes:** `SIZES` = 4×6, 5×7, 5×8 (default), 6×8, 6×10 ft.
- **Corebath packages** (`JOBS.bathroom` tiers: ₹1,60,000 / ₹2,20,000 / ₹3,00,000) are separate fixed all-in prices used on `#bathroom`, the home page and the estimator. Editors can override them from `#admin` → Prices; the overrides live in the database at `config/site`. `tierPrice()` applies them.
- **Disclaimer:** every price shows "Indicative MRP — final price in your quote". Keep that label on any new price display.

---

## 6. My bathrooms (the cart)

```js
project = {
  bathrooms: [
    { id, name:"Master bath", size:"5x8", basePackageId:"jaquar-signature" | "filter-coffee" | null,
      items:[ { productId, qty, note } ], services:{ install:true, waterproofing:true, tiling:true } }
  ],
  activeBathroomId
}
```

- **Saving.** It's saved to `localStorage["corespace-project-v1"]` inside try/catch (`saveProject()`). For signed-in customers it's also synced to the database at `data/users/<uid>/cart` as `{ project, ts }`. On load, the database copy is used only when the local project is empty.
- **Loading.** `cleanProject()` validates everything loaded: it drops unknown products and clamps quantities (1–20, or up to 1,000 sq ft for tiles). Run anything you add to the model through it.
- **Badge count.** The header badge counts items; a tile line counts as 1.
- **Checklist.** `ESSENTIALS` lists the checks each bathroom shows: WC, flushing, basin, basin tap, shower, health faucet, angle valves, floor drain. Missing items warn but never block.
- **Quote message.** `projectText()` builds the WhatsApp quote message. It's also attached to booking leads.

---

## 7. Database and settings (claude.ai only)

The Artifact is published with these capabilities and **runtime contract `0.2.76`**. Keep them identical on every publish (omitting `capabilities` on a republish keeps the stored ones):

```json
{
  "db": { "rules": [
    { "path": "",                  "read": "view",     "write": "admin" },
    { "path": "leads",             "read": "admin",    "write": "admin" },
    { "path": "leads/{self}",      "read": "interact", "write": "interact" },
    { "path": "leadindex",         "read": "admin",    "write": "admin" },
    { "path": "leadindex/{self}",  "read": "interact", "write": "interact" },
    { "path": "data/users/{self}", "read": "interact", "write": "interact" }
  ]},
  "downloads": {}, "sample": { "images": true }, "user": {}
}
```

| Path | Written by | Contents |
|---|---|---|
| `leads/<uid>/items/<ref>` | Booking forms | Name, mobile, area, apartment, preferred slot, job label, estimate text, project text, status, visit-fee flag |
| `leadindex/<uid>` | Booking forms | Last-lead timestamp, so the dashboard can find customers |
| `data/users/<uid>/profile` | My account | Customer profile |
| `data/users/<uid>/cart` | My bathrooms | `{ project, ts }` |
| `config/site` | `#admin` (editors) | `{ prices, bookingsOpen }` |

The new site has its **own empty database**: leads and profiles from the old site do not carry over.

---

## 8. Design system

Reuse these rather than adding new styles:

- **Fonts:** Archivo (condensed display, `--display`), IBM Plex Sans (body, `--body`), IBM Plex Mono (labels, `--mono`), all from Google Fonts.
- **Tokens:** `--paper`, `--surface`, `--ink`, `--ink-2`, `--line`, `--green`, `--soft`, `--ok`, `--warn`, `--err` on `:root`. The site is deliberately light-only.
- **Components:** `.btn` (`.line`, `.sm`, `.block`), `.doc` (quote card) with `.kv` rows and `.total`, `.tiers/.tier`, `.rows/.row`, `.chips`, `.fchip`/`.cchip`/`.bchip` (filter, category and bathroom chips), `.pcard` (product), `.lcard` (look), `.bitem` (bathroom line), `.sheet` (slide-in panel via `openSheet()`), `.notice` (`.ok`/`.warn`/`.bad`), `.final` (green call-to-action band), `.mrp` (price disclaimer label), `.label` (mono caps).
- **Rules the current build passes (keep them):**
  - Works at 360 px wide with no sideways scroll; 16–20 px side gutter.
  - Tap targets at least 44 px.
  - Visible focus outline (green).
  - Every button labelled.
  - `prefers-reduced-motion` respected.
  - The WhatsApp button hides while a form field is focused.

---

## 9. Publishing

**On claude.ai (current setup):**

1. Remove the first line (`<!doctype html>…<body>`) and the last line (`</body></html>`) of `index.html`. claude.ai adds its own skeleton.
2. Publish that file to the live Artifact URL above with the same capabilities and contract (section 7).

```bash
sed '1d;$d' index.html > /tmp/corespace-site.html
```

**On your own hosting:** the page works as a static file, but profiles, leads, the team dashboard, photo matching and PDF download depend on `window.claude` and will switch themselves off. To keep them you need a backend; replace the calls in the CAPABILITIES block and the `DB.doc(...)` / `DB.collection(...)` uses with your own API. Everything else needs no change.

---

## 10. Tests

These are browser tests with Playwright and Chromium. Screenshots go to `tests/out/` (git-ignored).

```bash
npm i -D playwright
```

```bash
npx playwright install chromium
```

```bash
for f in tests/*.test.js; do node "$f"; done
```

| File | Checks |
|---|---|
| `tests/layout.test.js` | Every route at 1280, 1140, 375 and 360 px: no sideways overflow, no script errors |
| `tests/project-flow.test.js` | Home has no non-bathroom words; shop filters, search, sort and empty state; 21 packages; compare; customise a package; swap Jaquar→Grohe; remove; 3 bathrooms with different brands; badge count; checklist; reload persistence; WhatsApp text |
| `tests/designs.test.js` | 6 looks; look route; size changes price; "Make it mine"; tiles in WhatsApp text; tile steps of 10 sq ft; tiles in shop |
| `tests/usability.test.js` | Phone shop height, sticky category jump, distinct icons, tap targets on key pages, WhatsApp button hiding |

Last run: 104 checks pass. The only console errors are Google Fonts and cdnjs failing in a sandbox without internet.

---

## 11. Open work, in priority order

1. **Real project photos.** Before-and-after, flood test and finished rooms. Then fill `pageProjects()`, put Projects back in `NAV` (RENDER HELPERS) and restore a photo section on the home page. This is the biggest trust gap.
2. **Labour rates.** Replace the `SERVICES` estimates with the owner's rates.
3. **Prices for the 130 indicative products,** and brand model numbers for all 187 (`modelCode`).
4. **Look renders.** Six renders exist in the owner's Canva account, but couldn't be downloaded in the build environment:
   - [Filter Coffee](https://www.canva.com/M/MAHZU1H_UPk)
   - [Monsoon Grey](https://www.canva.com/M/MAHZU4S_8c0)
   - [Lalbagh Green](https://www.canva.com/M/MAHZU8c8HWk)
   - [Kabini Stone](https://www.canva.com/M/MAHZU1jE4QU)
   - [Cubbon White](https://www.canva.com/M/MAHZU_gv2lo)
   - [Kids' Splash](https://www.canva.com/M/MAHZUyL7vIM)

   Export each as JPG (~1600 px wide, under 300 KB), publish it under `img/look-<id>.jpg` with the page, and set that look's `image`.
5. **Designer names.** All looks say "CoreSpace Studio".
6. **Product photos.** Cards use icons. Add an `image` URL per product and render it in `productCard()` and `openProduct()` when present.
7. **Check with the owner:**
   - The "Vanity unit with basin and mirror" (`cs-vanity`) is listed in packages alongside a separate basin and mirror; confirm what's supplied.
   - Angle valves and connection pipes are priced per piece (half the old per-pair rate).
8. **Clean-up:** some old CSS is unused (e.g. `.ddpanel`, `.catrow`, `.cat`, `.citem`). The old Artifact's kitchen/wardrobe images are not used by the new site.
9. **Sorting** by price mixes per-sq-ft tile rates with per-item prices. Consider sorting tiles separately.
