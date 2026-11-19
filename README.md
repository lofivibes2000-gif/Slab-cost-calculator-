# PourCost — Concrete Slab Cost Calculator

A static website for **PourCost**, a utility that prices concrete slabs.

The whole site is vanilla HTML, CSS and JavaScript — no framework, no build
dependencies, no runtime services. `build.mjs` is a ~300 line Node script that
injects the shared header/footer, renders the FAQ accordion and the JSON-LD
structured data, and writes `dist/`.

**Live site:** https://pourcost.com

---

## Why this exists

Concrete is usually only about 19% of an installed slab's cost — labour is
about 41%. A calculator that returns a volume leaves out the two largest line
items on the bill, and a single figure gives you nothing to plan around.

PourCost prices the whole installed scope in ten lines and returns a
**low / typical / high** band for each, rather than one false-precise number.
Every rate is a 2026 U.S. national average that you can override with your own
local quote.

---

## Pages

| Path | Primary keyword | What it does |
|---|---|---|
| `/` | concrete slab cost calculator | Full 10-line installed cost estimate, low/typ/high |
| `/concrete-calculator.html` | concrete calculator | 9 pour shapes, metric/imperial, 4 bag sizes, gravel volume |
| `/cost-per-square-foot.html` | concrete cost per square foot | Per-sq-ft breakdown and what each figure includes |
| `/ready-mix-vs-bags.html` | ready mix vs bags of concrete | Side-by-side comparison and the ~1 yd³ break-even |
| `/driveway-cost.html` | concrete driveway cost | Driveway-specific sizing, thickness, joints, curing |
| `/patio-cost.html` | concrete patio cost | Patio-specific sizing, reinforcement, decorative finishes |
| `/rebar-calculator.html` | rebar calculator | Bar size, spacing, lap length and linear footage |
| `/faq.html` | — (hub) | All 99 questions, grouped by topic |
| `/about.html` | concrete pricing methodology | Every rate, its source, and the low/typ/high method |

## Calculators

**7 calculators** across the site:

1. **Slab cost estimator** (homepage) — dimensions → 10-line installed price
2. **Concrete volume & bags** — slab, L-shape, round pad, footing, column, wall, stairs, triangle, custom multi-shape
3. **Cost per square foot explorer** — thickness and finish sweep
4. **Ready-mix vs bags comparator** — picks the cheaper method for your volume
5. **Driveway cost estimator**
6. **Patio cost estimator**
7. **Rebar calculator** — size, spacing, lap and linear footage

## Pricing model

Every rate is a **2026 U.S. national average** with a low / typical / high
band, drawn from four supplier price lists read in October 2026, plus NRMCA,
RSMeans, ACI 332/318/330R, IRC R506.1 and ACPA guidance. Every rate can be
overridden with a real local quote.

Reference point: a 20 × 20 ft slab at 4 inches = **$4,417** typical
($11.04/sq ft) — concrete $842, delivery $120, site prep $340, gravel base
$500, forms $180, reinforcement $180, vapor barrier $80, labour $1,800,
control joints $175, curing compound and sealer $200.

Sources and method: [`/about.html`](src/about.html).

---

## Getting started

```bash
node build.mjs          # writes dist/
```

That is the only build step. No `npm install` is required.

### Serving locally

```bash
node -e "const{createServer}=require('http'),{readFile}=require('fs/promises'),path=require('path');\
createServer(async(q,s)=>{try{let p=q.url.split('?')[0];if(p==='/')p='/index.html';\
let b=await readFile(path.join('dist',p));s.writeHead(200,{'Content-Type':{'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.xml':'application/xml','.txt':'text/plain'}[path.extname(p)]||'text/plain'});s.end(b)}catch{s.writeHead(404);s.end('nf')}}).listen(8080)"
```

### Tests

Three Playwright suites drive the built site and assert the maths, the live
recalculation, the accordion, the schema/visible parity, the unit toggle and
mobile layout:

```bash
node verify.mjs     # core calculator, price model, FAQ parity, SEO
node verify2.mjs    # shapes, metric toggle, bag sizes, above-the-fold position
node verify3.mjs    # triangle + custom shapes, m³, gravel, rebar table, FAQ overlap
node test.mjs       # per-page smoke test
```

They need Chromium at the Playwright path used in the scripts, and they start
their own static server on ports 8125 / 8160 / 8190.

---

## Content architecture

The FAQ is a **single source of truth** in `assets/js/faq.js`. The same
`faqFor()` call drives the server-rendered accordion, the client-side render,
the `FAQPage` JSON-LD and the generated jump-nav, so the visible content and
the structured data cannot drift apart.

- **6 shared core questions** appear on every page — the ones that genuinely
  apply to any pour.
- **12–16 page-owned questions** per page, each targeting that page's own
  keyword cluster.
- The **hub page** unions everything: **99 unique questions**.

This keeps the worst pairwise overlap between two topic pages at 33%, instead
of the 100% that a single shared FAQ block produces.

---

## Project layout

```
src/              HTML templates with {{HEADER}} / {{FOOTER}} / <!--FAQ_LIST--> placeholders
assets/css/       site.css — the whole design system
assets/js/        engine.js (pricing + geometry), faq.js (content), calc-*.js (one per calculator)
public/           robots.txt
build.mjs         the build: injects partials, FAQ, JSON-LD, canonical/OG tags, sitemap
verify*.mjs       Playwright test suites
dist/             build output — what GitHub Pages serves
```

## Deployment

`.github/workflows/pages.yml` builds `dist/` and publishes it to GitHub Pages
on every push to `main`. Set **Settings → Pages → Source → GitHub Actions**.

## Notes

- No tracking, no cookies, no third-party scripts except Google Fonts.
- The domain is hardcoded to `pourcost.com` in `build.mjs`; change `SITE_URL`
  there if the real domain differs.
- `README.md`, the source and `dist/` are committed; `.deploy-keys/` and
  `node_modules/` are not.
