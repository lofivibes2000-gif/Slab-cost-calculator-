/* Interaction test: change inputs, verify recalculation; test FAQ accordion; mobile nav */
import { chromium } from "/usr/local/lib/node_modules/playwright/index.mjs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
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
await new Promise((r) => server.listen(8125, r));

const browser = await chromium.launch({
  executablePath: "/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});
const errors = [];
const fail = [];
function check(label, cond, detail) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  if (!cond) fail.push(label);
}

console.log("\n═══ MAIN CALCULATOR: live recalculation ═══");
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("pageerror", (e) => errors.push("index: " + e.message));
  await page.goto("http://localhost:8125/", { waitUntil: "networkidle" });

  const base = await page.textContent("#headline-value");
  check("default 20x20x4in renders", base === "$4,417", base);

  // change length -> should recalc
  await page.fill("#f-length", "30");
  await page.waitForTimeout(150);
  const after = await page.textContent("#headline-value");
  check("changing length recalculates", after !== base, `${base} -> ${after}`);

  // change thickness -> recalc
  await page.fill("#f-thickness", "6");
  await page.waitForTimeout(150);
  const t6 = await page.textContent("#headline-value");
  check("changing thickness recalculates", t6 !== after, `${after} -> ${t6}`);

  // change finish -> stamped should add cost
  await page.fill("#f-thickness", "4");
  await page.waitForTimeout(150);
  const at4 = await page.textContent("#headline-value");
  await page.selectOption("#f-finish", "stamped");
  await page.waitForTimeout(150);
  const stamped = await page.textContent("#headline-value");
  check("stamped finish increases cost", parseInt(stamped.replace(/[$,]/g, "")) > parseInt(at4.replace(/[$,]/g, "")), `4in=${at4} stamped=${stamped}`);

  // reinforcement select must also apply
  await page.selectOption("#f-finish", "broom");
  await page.selectOption("#f-reinf", "rebar");
  await page.waitForTimeout(150);
  const rebarC = await page.textContent("#headline-value");
  check("rebar option applies", parseInt(rebarC.replace(/[$,]/g, "")) > parseInt(at4.replace(/[$,]/g, "")), `mesh=${at4} rebar=${rebarC}`);
  await page.selectOption("#f-reinf", "wire");
  await page.waitForTimeout(150);
  const backToMesh = await page.textContent("#headline-value");
  check("reinforcement revert applies", backToMesh === at4, `mesh=${at4} revert=${backToMesh}`);

  // region change
  await page.selectOption("#f-finish", "broom");
  await page.selectOption("#f-region", "west");
  await page.waitForTimeout(150);
  const west = await page.textContent("#headline-value");
  check("West Coast region raises cost", parseInt(west.replace(/[$,]/g, "")) > parseInt(base.replace(/[$,]/g, "")), `base=${base} west=${west}`);

  // quantity
  await page.selectOption("#f-region", "national");
  await page.fill("#f-qty", "3");
  await page.waitForTimeout(150);
  const q3 = await page.textContent("#headline-value");
  check("quantity 3 raises cost ~3x", parseInt(q3.replace(/[$,]/g, "")) > parseInt(base.replace(/[$,]/g, "")) * 2.5, `base=${base} q3=${q3}`);
  await page.fill("#f-qty", "1");

  // L-shape mode
  await page.click('label[for="shape-lshape"]');
  await page.waitForTimeout(150);
  const lVisible = await page.locator("#shape-lshape-fields").isVisible();
  check("L-shape dimension fields become visible", lVisible);
  const lArea = await page.textContent("#stat-area");
  check("L-shape area computed", lArea !== "—", lArea);
  const lVal = await page.textContent("#headline-value");
  check("L-shape cost recalculates", lVal !== base, `${base} -> ${lVal}`);

  // circle mode
  await page.click('label[for="shape-circle"]');
  await page.waitForTimeout(150);
  const cArea = await page.textContent("#stat-area");
  check("circle area = pi r^2 (d=12 -> 113.1)", cArea.startsWith("113"), cArea);

  // breakdown rows
  await page.click('label[for="shape-rect"]');
  await page.waitForTimeout(150);
  const rows = await page.locator("#breakdown .bd-row").count();
  check("cost breakdown renders line items", rows >= 8, `${rows} rows`);

  // totals
  const low = await page.textContent("#total-low");
  const typ = await page.textContent("#total-typ");
  const high = await page.textContent("#total-high");
  const n = (s) => parseInt(s.replace(/[$,]/g, ""), 10);
  check("low < typical < high", n(low) < n(typ) && n(typ) < n(high), `${low} / ${typ} / ${high}`);

  // shareable hash
  const hash = page.url();
  check("URL hash carries state", hash.includes("#") && hash.includes("s=rect"), hash.split("#")[1]?.slice(0, 60));

  // FAQ accordion
  const first = page.locator(".faq-item").first();
  await first.locator("summary").click();
  await page.waitForTimeout(200);
  check("FAQ accordion opens", await first.evaluate((el) => el.open));

  // FAQ schema matches visible questions
  const visibleQs = await page.locator("#faq-list summary.faq-q").allTextContents();
  const schema = await page.evaluate(() => {
    const s = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((x) => { try { return JSON.parse(x.textContent); } catch { return null; } })
      .find((x) => x && x["@type"] === "FAQPage");
    return s;
  });
  check("FAQPage schema exists", !!schema);
  check("schema question count matches visible", schema.mainEntity.length === visibleQs.length, `schema=${schema.mainEntity.length} visible=${visibleQs.length}`);
  check("schema Q text matches visible Q text", schema.mainEntity[0].name === visibleQs[0].trim());
  check("schema answers are non-empty", schema.mainEntity.every((q) => q.acceptedAnswer.text.length > 40));
  check("no placeholder tokens in schema", !JSON.stringify(schema).includes("<!--"));

  await page.close();
}

console.log("\n═══ VOLUME CALCULATOR ═══");
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("pageerror", (e) => errors.push("volume: " + e.message));
  await page.goto("http://localhost:8125/concrete-calculator.html", { waitUntil: "networkidle" });
  const yd = await page.textContent("#v-cuyd");
  check("20x20x4in = 4.94 yd3", yd.includes("4.94"), yd);
  await page.fill("#v-length", "10");
  await page.fill("#v-width", "10");
  await page.waitForTimeout(150);
  const yd10 = await page.textContent("#v-cuyd");
  check("10x10x4in = 1.23 yd3", yd10.includes("1.23"), yd10);
  const bags = await page.textContent("#v-bags80");
  check("10x10 bags = 62 (incl 10% waste)", bags.includes("62"), bags);
  await page.click('[data-vshape="lshape"]');
  await page.waitForTimeout(150);
  const lShape = await page.textContent("#v-area");
  check("L-shape area = 24*18 - 10*8 = 352", lShape.startsWith("352"), lShape);
  await page.click('[data-vshape="circle"]');
  await page.fill("#v-diameter", "10");
  await page.waitForTimeout(150);
  const circ = await page.textContent("#v-area");
  check("circle d=10 area = 78.5 (rounds to 79)", circ.startsWith("79"), circ);
  await page.close();
}

console.log("\n═══ READY-MIX VS BAGS ═══");
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("pageerror", (e) => errors.push("compare: " + e.message));
  await page.goto("http://localhost:8125/ready-mix-vs-bags.html", { waitUntil: "networkidle" });
  const winner = await page.textContent("#cmp-savings");
  check("12x12x4in (1.78 yd3) -> ready-mix wins", winner.trim() === "Ready-mix", winner);
  await page.fill("#c-length", "8"); await page.fill("#c-width", "8");
  await page.waitForTimeout(200);
  const winner2 = await page.textContent("#cmp-savings");
  check("8x8x4in (0.79 yd3) -> bags win", winner2.trim() === "Bags", winner2);
  await page.close();
}

console.log("\n═══ REBAR ═══");
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("pageerror", (e) => errors.push("rebar: " + e.message));
  await page.goto("http://localhost:8125/rebar-calculator.html", { waitUntil: "networkidle" });
  const ft = await page.textContent("#r-ft");
  const pieces = await page.textContent("#r-pieces");
  check("20x20 #4 @18in both ways = 662 lf / 30 bars", ft.includes("662") && pieces.includes("30"), `${ft} / ${pieces}`);
  await page.uncheck("#r-bothways");
  await page.waitForTimeout(150);
  const ft1 = await page.textContent("#r-ft");
  check("one way only = 331 lf", ft1.includes("331"), ft1);
  await page.close();
}

console.log("\n═══ FAQ HUB ═══");
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("pageerror", (e) => errors.push("faq: " + e.message));
  await page.goto("http://localhost:8125/faq.html", { waitUntil: "networkidle" });
  const n = await page.locator("#faq-list details.faq-item").count();
  check("hub shows all 99 questions", n === 99, `${n}`);
  const cnt = await page.textContent("#faq-count");
  check("count label matches", cnt.trim() === "99", cnt);
  await page.close();
}

console.log("\n═══ MOBILE ═══");
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page.on("pageerror", (e) => errors.push("mobile: " + e.message));
  await page.goto("http://localhost:8125/", { waitUntil: "networkidle" });
  const navHidden = await page.locator("#main-nav").evaluate((el) => getComputedStyle(el).display);
  check("nav collapsed on mobile", navHidden === "none", navHidden);
  await page.click(".nav-toggle");
  await page.waitForTimeout(250);
  const navOpen = await page.locator("#main-nav").evaluate((el) => getComputedStyle(el).display);
  check("nav opens on toggle", navOpen !== "none", navOpen);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check("no horizontal overflow", !overflow, overflow ? `scrollWidth=${await page.evaluate(() => document.documentElement.scrollWidth)}` : "");
  await page.screenshot({ path: path.join(__dirname, "shots", "mobile-index.png"), fullPage: false });
  await page.close();
}

console.log("\n═══ SEO ═══");
{
  const page = await browser.newPage();
  await page.goto("http://localhost:8125/", { waitUntil: "networkidle" });
  const seo = await page.evaluate(() => ({
    title: document.title,
    desc: document.querySelector('meta[name="description"]')?.content,
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    og: document.querySelector('meta[property="og:image"]')?.content,
    h1s: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()),
    h2s: [...document.querySelectorAll("h2")].length,
    words: document.body.innerText.split(/\s+/).length
  }));
  check("single h1", seo.h1s.length === 1, seo.h1s.join(" | "));
  check("has meta description > 100 chars", seo.desc?.length > 100, `${seo.desc?.length} chars`);
  check("has canonical", !!seo.canonical, seo.canonical);
  check("has og:image", !!seo.og, seo.og);
  check("has h2 subheadings", seo.h2s >= 5, `${seo.h2s} h2s`);
  check("content depth > 2500 words", seo.words > 2500, `${seo.words} words`);

  // sitemap + robots
  const sm = await page.goto("http://localhost:8125/sitemap.xml");
  check("sitemap.xml served", sm.status() === 200);
  const rb = await page.goto("http://localhost:8125/robots.txt");
  check("robots.txt served", rb.status() === 200);
  await page.close();
}

console.log("\n═══ PAGE ERRORS ═══");
console.log(errors.length ? errors.join("\n") : "  none");
console.log("\n═══ SUMMARY ═══");
console.log(fail.length ? `FAILED: ${fail.join(" | ")}` : "ALL CHECKS PASSED");
await browser.close();
server.close();
