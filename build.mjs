/* ==========================================================================
   PourCost build script
   - Injects shared header/footer partials
   - Injects the FAQ accordion (rendered server-side from faq.js)
   - Injects FAQPage + WebApplication + BreadcrumbList structured data
   - Copies static assets
   - Generates sitemap.xml and robots.txt
   ========================================================================== */
import { readFile, writeFile, mkdir, readdir, rm, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const SRC = path.join(__dirname, "src");
const OUT = path.join(__dirname, "dist");
const ASSETS = path.join(__dirname, "assets");
const PUBLIC = path.join(__dirname, "public");

const SITE_URL = "https://pourcost.com";
const SITE_NAME = "PourCost";
const BUILD_DATE = "2026-10-25";

/* ---------- Load the FAQ data (single source of truth) ----------
   faq.js is written for the browser: it assigns to `window` when present and
   to `this` (module.exports in CommonJS) otherwise. Requiring it directly
   therefore yields the same object the browser gets. */
const Faq = require(path.join(__dirname, "assets/js/faq.js")).PourCostFaq;

if (!Faq || !Faq.faqFor) {
  throw new Error("faq.js did not export PourCostFaq — check the IIFE global binding.");
}

/* ---------- Shared partials ---------- */
const HEADER = `<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 8h18v11H3z"/><path d="M3 8l3-4h12l3 4"/><path d="M8 12h8"/>
        </svg>
      </span>
      <span class="brand-name">Pour<span>Cost</span></span>
    </a>
    <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="main-nav">
      <span></span>
    </button>
    <nav class="main-nav" id="main-nav" aria-label="Main">
      <ul>
        <li><a href="/">Slab Cost Calculator</a></li>
        <li><a href="/concrete-calculator.html">Concrete Calculator</a></li>
        <li><a href="/cost-per-square-foot.html">Cost Per Sq Ft</a></li>
        <li><a href="/ready-mix-vs-bags.html">Ready-Mix vs Bags</a></li>
        <li><a href="/driveway-cost.html">Driveway Cost</a></li>
        <li><a href="/patio-cost.html">Patio Cost</a></li>
        <li><a href="/rebar-calculator.html">Rebar Calculator</a></li>
        <li><a href="/faq.html">FAQ</a></li>
      </ul>
    </nav>
  </div>
</header>`;

const FOOTER = `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="brand" href="/">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 8h18v11H3z"/><path d="M3 8l3-4h12l3 4"/><path d="M8 12h8"/>
            </svg>
          </span>
          <span class="brand-name">Pour<span>Cost</span></span>
        </a>
        <p>Free concrete slab cost calculator and estimating tools. 2026 U.S. pricing benchmarks you can override with your own local quotes.</p>
        <p class="small" style="color:#6b7280">Planning estimates only. Not a quote, contract, structural design, or code determination.</p>
      </div>
      <div>
        <h4>Calculators</h4>
        <ul>
          <li><a href="/">Concrete Slab Cost Calculator</a></li>
          <li><a href="/concrete-calculator.html">Concrete Volume &amp; Bags</a></li>
          <li><a href="/ready-mix-vs-bags.html">Ready-Mix vs Bags</a></li>
          <li><a href="/rebar-calculator.html">Rebar Calculator</a></li>
        </ul>
      </div>
      <div>
        <h4>Cost Guides</h4>
        <ul>
          <li><a href="/cost-per-square-foot.html">Cost Per Square Foot</a></li>
          <li><a href="/driveway-cost.html">Concrete Driveway Cost</a></li>
          <li><a href="/patio-cost.html">Concrete Patio Cost</a></li>
          <li><a href="/faq.html">Concrete Slab FAQ</a></li>
        </ul>
      </div>
      <div>
        <h4>Reference</h4>
        <ul>
          <li><a href="/about.html">Pricing &amp; Methodology</a></li>
          <li><a href="/about.html#sources">Sources</a></li>
          <li><a href="/faq.html">FAQ</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; <span data-year>2026</span> PourCost. Prices last reviewed October 2026.</span>
      <span>Estimates only — always get 3 local quotes.</span>
    </div>
    <p class="footer-disclaimer">This calculator provides estimates. Always consult a professional for structural requirements.</p>
  </div>
</footer>`;

/* ---------- Structured data builders ---------- */
// Both the server-rendered HTML and the client-side renderer call the same
// faqFor() from faq.js, so the two can never disagree.
function faqListFor(pageKey) {
  return Faq.faqFor(pageKey);
}

function faqSchema(pageKey) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqListFor(pageKey).map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: Faq.stripTags(`<p>${it.a}</p>`) }
    }))
  };
}

function webAppSchema(meta) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: meta.name,
    url: `${SITE_URL}/${meta.slug === "index" ? "" : meta.slug}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    description: meta.description,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL }
  };
}

function breadcrumbSchema(meta) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      ...(meta.crumbs || []).map((c, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: c.name,
        item: `${SITE_URL}/${c.slug}`
      }))
    ]
  };
}

function faqListHtml(pageKey) {
  return faqListFor(pageKey)
    .map(
      (it) => `        <details class="faq-item" id="faq-${it.id}">
          <summary class="faq-q">${it.q}</summary>
          <div class="faq-a">${it.a
            .split(/\n\n/)
            .map((p) => `<p>${p}</p>`)
            .join("\n            ")}</div>
        </details>`
    )
    .join("\n");
}

/* Jump-nav pills, generated from the same list as the accordion so the two
   can never drift. The label is the question trimmed to a readable length. */
/* Jump-nav pills, generated from the same list as the accordion so the two
   can never drift. The label is the question trimmed to a readable length.
   The hub groups its pills by topic, because 99 flat pills is a wall. */
const FAQ_GROUP_LABELS = {
  index: "Slab cost calculator",
  "concrete-calculator": "Volume, bags &amp; metric",
  "cost-per-square-foot": "Cost per square foot",
  "ready-mix-vs-bags": "Ready-mix vs bags",
  "driveway-cost": "Driveways",
  "patio-cost": "Patios",
  "rebar-calculator": "Reinforcement"
};

function faqPills(items) {
  return items
    .map((it) => {
      const label = it.q.length > 42 ? it.q.slice(0, 42).replace(/[\s,?.]+$/, "") + "…" : it.q;
      return `        <a href="#faq-${it.id}">${label}</a>`;
    })
    .join("\n");
}

function faqNavHtml(pageKey) {
  if (pageKey === "faq") {
    // Grouped: shared core first, then one group per topic page.
    const groups = [["Every page", Faq.CORE]];
    Object.keys(Faq.PAGE_FAQ).forEach((key) => {
      groups.push([FAQ_GROUP_LABELS[key] || key, Faq.PAGE_FAQ[key]]);
    });
    return groups
      .map(
        ([label, items]) =>
          `        <div class="faq-nav__group">\n` +
          `          <span class="faq-nav__label">${label}</span>\n` +
          `          <div class="faq-nav__pills">\n${faqPills(items)}\n          </div>\n` +
          `        </div>`
      )
      .join("\n");
  }
  const items = faqListFor(pageKey);
  if (!items.length) return "";
  return faqPills(items);
}

/* ---------- Page metadata registry ---------- */
const PAGES = {
  "index": {
    file: "index.html",
    title: "Concrete Slab Cost Calculator — Installed Price in 2026",
    description:
      "Free concrete slab cost calculator. Get cubic yards, bag counts, and a full installed price breakdown — concrete, base, rebar, labor, and finishing — in seconds. 2026 U.S. pricing.",
    crumbs: [],
    scripts: ["assets/js/calc-main.js"]
  },
  "concrete-calculator": {
    file: "concrete-calculator.html",
    title: "Concrete Calculator — Cubic Yards, Bags & Volume (2026)",
    description:
      "Free concrete calculator for slabs, L-shapes, and round pads. Convert dimensions to cubic yards, cubic feet, and 40/60/80 lb bag counts with a waste allowance.",
    crumbs: [{ name: "Concrete Calculator", slug: "concrete-calculator.html" }],
    scripts: ["assets/js/calc-volume.js"]
  },
  "cost-per-square-foot": {
    file: "cost-per-square-foot.html",
    title: "Concrete Cost Per Square Foot in 2026 — Full Breakdown",
    description:
      "What does concrete cost per square foot? 2026 installed pricing broken into concrete, labor, base, forms, rebar and finishing — with per-thickness and per-size tables.",
    crumbs: [{ name: "Cost Per Square Foot", slug: "cost-per-square-foot.html" }],
    scripts: ["assets/js/calc-sqft.js"]
  },
  "ready-mix-vs-bags": {
    file: "ready-mix-vs-bags.html",
    title: "Ready-Mix vs Bags of Concrete — Which Is Cheaper?",
    description:
      "Compare ready-mix truck cost against bags of concrete for your pour. See the breakeven point, delivery and short-load fees, and total cost side by side.",
    crumbs: [{ name: "Ready-Mix vs Bags", slug: "ready-mix-vs-bags.html" }],
    scripts: ["assets/js/calc-compare.js"]
  },
  "driveway-cost": {
    file: "driveway-cost.html",
    title: "Concrete Driveway Cost in 2026 — Per Square Foot & Total",
    description:
      "How much does a concrete driveway cost? 2026 installed pricing per square foot, total cost by driveway size, and what drives a quote up or down.",
    crumbs: [{ name: "Driveway Cost", slug: "driveway-cost.html" }],
    scripts: ["assets/js/calc-driveway.js"]
  },
  "patio-cost": {
    file: "patio-cost.html",
    title: "Concrete Patio Cost in 2026 — Per Square Foot & Total",
    description:
      "How much does a concrete patio cost? 2026 pricing per square foot, total cost by patio size, and a line-item breakdown of what you are paying for.",
    crumbs: [{ name: "Patio Cost", slug: "patio-cost.html" }],
    scripts: ["assets/js/calc-patio.js"]
  },
  "rebar-calculator": {
    file: "rebar-calculator.html",
    title: "Rebar Calculator — Linear Feet, Pieces & Cost for a Slab",
    description:
      "Free rebar calculator. Get linear feet, bar count, and material cost for a concrete slab by bar size and spacing, plus the mesh vs rebar comparison.",
    crumbs: [{ name: "Rebar Calculator", slug: "rebar-calculator.html" }],
    scripts: ["assets/js/calc-rebar.js"]
  },
  "faq": {
    file: "faq.html",
    title: "Concrete Slab Cost FAQ — Every Question Answered (2026)",
    description:
      "Answers to the most-searched concrete questions: how much a slab costs per square foot, how many bags of concrete you need, how thick a slab should be, and what PSI to use.",
    crumbs: [{ name: "FAQ", slug: "faq.html" }],
    scripts: []
  },
  "about": {
    file: "about.html",
    title: "Concrete Pricing & Methodology — Where Our Numbers Come From",
    description:
      "How PourCost builds its 2026 concrete pricing model. Every rate, its source, the method behind the low/typical/high range, and how to make the estimate match your quote.",
    crumbs: [{ name: "About", slug: "about.html" }],
    scripts: []
  }
};

/* ---------- Build ---------- */
async function build() {
  if (existsSync(OUT)) await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const files = await readdir(SRC);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));

  for (const file of htmlFiles) {
    const key = Object.keys(PAGES).find((k) => PAGES[k].file === file);
    if (!key) {
      console.warn(`  ! no metadata for ${file}, skipping`);
      continue;
    }
    const meta = PAGES[key];
    let html = await readFile(path.join(SRC, file), "utf8");

    // Partials
    html = html.replace("{{HEADER}}", HEADER);
    html = html.replace("{{FOOTER}}", FOOTER);

    // FAQ accordion
    html = html.replace(/<!--\s*FAQ_LIST\s*-->/g, faqListHtml(key));

    // FAQ jump-nav, generated from the same list as the accordion
    html = html.replace(/<!--\s*FAQ_NAV\s*-->/g, faqNavHtml(key));

    // FAQ count badge, so the number can never disagree with the list
    html = html.replace(/<!--\s*FAQ_COUNT\s*-->/g, String(faqListFor(key).length));

    // Structured data
    const schemas = [webAppSchema({ ...meta, slug: key }), breadcrumbSchema(meta)];
    if (key !== "about") schemas.push(faqSchema(key));
    const ld = schemas.map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join("\n");
    html = html.replace("<!--SCHEMA-->", ld);

    // Year
    html = html.replace(/\{\{YEAR\}\}/g, BUILD_DATE.slice(0, 4));

    // Canonical + OG tags. Use global replaces — OG_TITLE / OG_DESC each appear
    // twice (Open Graph + Twitter card), so a single-shot replace would leak
    // the raw placeholder into the Twitter meta tags.
    const url = `${SITE_URL}/${key === "index" ? "" : meta.file}`;
    html = html.replace(/\{\{CANONICAL\}\}/g, url);
    html = html.replace(/\{\{OG_URL\}\}/g, url);
    html = html.replace(/\{\{OG_TITLE\}\}/g, meta.title);
    html = html.replace(/\{\{OG_DESC\}\}/g, meta.description);

    await writeFile(path.join(OUT, file), html, "utf8");
    console.log(`  ✓ ${file}  (${(html.length / 1024).toFixed(1)} KB)`);
  }

  // Assets
  await cp(ASSETS, path.join(OUT, "assets"), { recursive: true });
  await cp(PUBLIC, OUT, { recursive: true });

  // Sitemap
  const urls = Object.entries(PAGES)
    .map(([key, meta]) => {
      const url = `${SITE_URL}/${key === "index" ? "" : meta.file}`;
      const priority = key === "index" ? "1.0" : key === "faq" ? "0.8" : "0.9";
      return `  <url>
    <loc>${url}</loc>
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join("\n");

  await writeFile(
    path.join(OUT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    "utf8"
  );

  console.log("  ✓ sitemap.xml");
  console.log("\nBuild complete →", OUT);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
