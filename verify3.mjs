/* Verify the spec-compliance round: triangle + custom shapes, cubic metres,
   gravel base volume, rebar recommendation table, and the FAQ de-duplication. */
import { chromium } from "/usr/local/lib/node_modules/playwright/index.mjs";
// Resolve the Playwright Chromium binary at runtime so a sandbox/browser
// upgrade never breaks the suites with a hard-coded build number.
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
function chromiumPath() {
  const base = "/root/.cache/ms-playwright";
  const dirs = existsSync(base) ? readdirSync(base).filter((d) => d.startsWith("chromium-")).sort().reverse() : [];
  for (const d of dirs) {
    for (const p of [`${base}/${d}/chrome-linux64/chrome`, `${base}/${d}/chrome-linux/chrome`]) {
      if (existsSync(p)) return p;
    }
  }
  return undefined; // fall back to Playwright's bundled download
}

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "docs");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".xml": "application/xml", ".txt": "text/plain" };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const buf = await readFile(path.join(DIST, p));
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "text/plain" });
    res.end(buf);
  } catch { res.writeHead(404); res.end("nf"); }
});
await new Promise((r) => server.listen(8190, r));

const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});
const errors = [];
const fail = [];
function check(label, cond, detail) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  if (!cond) fail.push(label);
}
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

/* ---------- A. New shapes ---------- */
console.log("\n═══ TRIANGLE & CUSTOM SHAPES ═══");
await page.goto("http://localhost:8190/concrete-calculator.html", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

await page.click('[data-vshape="triangle"]');
await page.waitForTimeout(400);
let area = await page.textContent("#v-area");
let yd = await page.textContent("#v-cuyd");
check("triangle 20x12 = 120 sq ft", area.startsWith("120"), area);
check("triangle 20x12 @4in = 1.48 yd3", yd.includes("1.48"), yd);

// right-angle variant changes perimeter but not area
await page.selectOption("#v-tri-type", "right");
await page.waitForTimeout(400);
area = await page.textContent("#v-area");
yd = await page.textContent("#v-cuyd");
check("right triangle keeps 120 sq ft", area.startsWith("120"), area);
check("right triangle keeps 1.48 yd3", yd.includes("1.48"), yd);

await page.click('[data-vshape="custom"]');
await page.waitForTimeout(500);
const rows0 = await page.locator(".custom-row").count();
check("custom builder renders component rows", rows0 === 2, `${rows0} rows`);
// default: 20x20 rect + 12ft circle = 400 + 113.1 = 513 sq ft
area = await page.textContent("#v-area");
check("custom 20x20 + 12ft circle = 513 sq ft", area.startsWith("513"), area);

await page.click("#v-custom-add");
await page.waitForTimeout(400);
const rows1 = await page.locator(".custom-row").count();
check("add shape adds a component", rows1 === 3, `${rows1} rows`);

await page.locator(".custom-row__remove").first().click();
await page.waitForTimeout(400);
const rows2 = await page.locator(".custom-row").count();
check("remove deletes a component", rows2 === 2, `${rows2} rows`);

// switch the first component to a triangle: 20 base x 10 height -> 100 sq ft
await page.locator(".custom-row__type").first().selectOption("triangle");
await page.waitForTimeout(500);
area = await page.textContent("#v-area");
check("component type switch changes the math", area.startsWith("213") || area.startsWith("100"), area);

/* ---------- B. Metric + gravel output ---------- */
console.log("\n═══ CUBIC METRES + GRAVEL BASE ═══");
await page.click('[data-vshape="rect"]');
await page.waitForTimeout(400);
let cum = await page.textContent("#v-cum");
let gravel = await page.textContent("#v-gravel");
check("cubic metres shown (400 sq ft @4in = 3.78 m3)", cum.includes("3.78"), cum);
check("gravel base shown (400 sq ft @4in = 4.94 yd3)", gravel.includes("4.94"), gravel);

await page.fill("#v-base-depth", "6");
await page.waitForTimeout(400);
gravel = await page.textContent("#v-gravel");
check("gravel recalculates at 6in (7.41 yd3)", gravel.includes("7.41"), gravel);

await page.click('label[for="vsys-metric"]');
await page.waitForTimeout(600);
cum = await page.textContent("#v-cum");
const len = await page.inputValue("#v-length");
check("metric toggle converts length to metres", Math.abs(parseFloat(len) - 6.096) < 0.01, len);
check("cubic metres unchanged after unit switch", cum.includes("3.78"), cum);
await page.click('label[for="vsys-imperial"]');
await page.waitForTimeout(600);
const len2 = await page.inputValue("#v-length");
check("switch back restores feet", Math.abs(parseFloat(len2) - 20) < 0.01, len2);

/* ---------- C. Rebar recommendation table ---------- */
console.log("\n═══ REBAR RECOMMENDATION ═══");
const rebarRows = await page.locator(".table-wrap table tr").evaluateAll((rows) =>
  rows.map((r) => r.innerText.replace(/\s+/g, " ").trim())
);
const joined = rebarRows.join(" | ");
check("rebar table recommends #3 @ 24 in", joined.includes("#3") && joined.includes("24 in"), "");
check("rebar table recommends #4 @ 18 in", joined.includes("#4") && joined.includes("18 in"), "");
check("rebar table gives 40x-diameter lap rule", joined.includes("16 in") && joined.includes("20 in"), "");

/* ---------- D. Waste factor range ---------- */
console.log("\n═══ WASTE FACTOR ═══");
const wasteOpts = await page.locator("#v-waste option").evaluateAll((o) => o.map((x) => x.value));
check("waste factor adjustable 0-20%", wasteOpts.includes("0") && wasteOpts.includes("20") && wasteOpts.includes("10"), wasteOpts.join(","));

/* ---------- E. FAQ de-duplication ---------- */
console.log("\n═══ FAQ DE-DUPLICATION ═══");
const PAGES = ["index", "concrete-calculator", "cost-per-square-foot", "ready-mix-vs-bags", "driveway-cost", "patio-cost", "rebar-calculator"];
const FILE = { index: "index.html", "concrete-calculator": "concrete-calculator.html", "cost-per-square-foot": "cost-per-square-foot.html", "ready-mix-vs-bags": "ready-mix-vs-bags.html", "driveway-cost": "driveway-cost.html", "patio-cost": "patio-cost.html", "rebar-calculator": "rebar-calculator.html" };

for (const p of PAGES) {
  const p2 = await ctx.newPage();
  p2.on("pageerror", (e) => errors.push(p + ": " + e.message));
  await p2.goto("http://localhost:8190/" + FILE[p], { waitUntil: "networkidle" });
  await p2.waitForTimeout(500);

  const n = await p2.locator("#faq-list details.faq-item").count();
  const badge = await p2.textContent("#faq-count");
  check(`${p}: badge matches visible count`, badge.trim() === String(n), `badge=${badge.trim()} visible=${n}`);

  const navLinks = await p2.locator(".faq-nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  const bad = [];
  for (const href of navLinks) if (!(await p2.locator(href).count())) bad.push(href);
  check(`${p}: every jump-nav link resolves (${navLinks.length})`, bad.length === 0, bad.join(", "));

  const schema = await p2.evaluate(() => {
    const s = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((x) => { try { return JSON.parse(x.textContent); } catch { return null; } })
      .find((x) => x && x["@type"] === "FAQPage");
    return s;
  });
  check(`${p}: FAQPage schema == visible count`, schema && schema.mainEntity.length === n, `schema=${schema ? schema.mainEntity.length : "none"} visible=${n}`);

  // measure how much of this page's FAQ text is shared with the next page
  await p2.close();
}

// pairwise overlap between every pair of topic pages
console.log("\n═══ OVERLAP BETWEEN TOPIC PAGES ═══");
const sigs = {};
for (const p of PAGES) {
  const p2 = await ctx.newPage();
  await p2.goto("http://localhost:8190/" + FILE[p], { waitUntil: "networkidle" });
  await p2.waitForTimeout(400);
  sigs[p] = await p2.evaluate(() =>
    [...document.querySelectorAll("#faq-list details.faq-item")].map((d) => ({
      id: d.id,
      words: d.querySelector(".faq-a").innerText.trim().split(/\s+/).length
    }))
  );
  await p2.close();
}
let worst = 0, worstPair = "";
for (let i = 0; i < PAGES.length; i++) {
  for (let j = i + 1; j < PAGES.length; j++) {
    const ids = new Set(sigs[PAGES[i]].map((x) => x.id));
    let shared = 0, total = 0;
    sigs[PAGES[i]].forEach((x) => { total += x.words; });
    sigs[PAGES[j]].forEach((x) => { if (ids.has(x.id)) shared += x.words; });
    const pct = Math.round((shared / total) * 100);
    if (pct > worst || worstPair === "") { worst = Math.max(worst, pct); worstPair = PAGES[i] + " vs " + PAGES[j]; }
  }
}
check("no two topic pages share more than 40% of their FAQ text", worst <= 40, `worst ${worst}% (${worstPair})`);

/* ---------- F. Spec-required content ---------- */
console.log("\n═══ SPEC CONTENT ═══");
const p3 = await ctx.newPage();
await p3.goto("http://localhost:8190/faq.html", { waitUntil: "networkidle" });
await p3.waitForTimeout(500);
const faqText = (await p3.textContent("#faq-list")).toLowerCase();
check("FAQ covers 50 lb bag yield", faqText.includes("0.375 cubic feet") || faqText.includes("0.375 ft"), "");
check("FAQ covers rebar overlap rule (40x diameter)", faqText.includes("40 times the bar diameter"), "");
check("FAQ covers concrete mix ratio", faqText.includes("1 part cement") || faqText.includes("mix ratio"), "");
check("FAQ covers weight per cubic foot", faqText.includes("150 pounds per cubic foot") || faqText.includes("150 lb per cubic foot"), "");
const hubN = await p3.locator("#faq-list details.faq-item").count();
check("hub has 99 questions", hubN === 99, `${hubN}`);
await p3.close();

const p4 = await ctx.newPage();
await p4.goto("http://localhost:8190/", { waitUntil: "networkidle" });
const howTo = (await p4.textContent("body")).toLowerCase();
check("homepage has a How to Use section", howTo.includes("how to use"), "");
check("footer carries the professional-advice disclaimer", howTo.includes("consult a professional") || howTo.includes("always consult"), "");
await p4.close();

console.log("\n═══ PAGE ERRORS ═══");
console.log(errors.length ? errors.join("\n") : "  none");
console.log("\n═══ SUMMARY ═══");
console.log(fail.length ? `FAILED: ${fail.join(" | ")}` : "ALL CHECKS PASSED");
await browser.close();
server.close();
