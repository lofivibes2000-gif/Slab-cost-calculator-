/* Verify the competitive reformat: new shapes, metric toggle, 50lb bags, fold position */
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
await new Promise((r) => server.listen(8160, r));

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

/* ---------- A. New shape modes ---------- */
console.log("\n═══ SHAPE MODES (concrete calculator) ═══");
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("pageerror", (e) => errors.push("volume: " + e.message));
  await page.goto("http://localhost:8160/concrete-calculator.html", { waitUntil: "networkidle" });

  // Slab (default)
  let yd = await page.textContent("#v-cuyd");
  check("slab 20x20x4in = 4.94 yd3", yd.includes("4.94"), yd);

  // Footing: 10ft x 2ft x 12in deep = 20 cuft = 0.741 yd3
  await page.click('[data-vshape="footing"]');
  await page.waitForTimeout(250);
  yd = await page.textContent("#v-cuyd");
  check("footing 10x2x12in = 0.74 yd3", yd.includes("0.74"), yd);
  const fGroup = await page.locator("#vg-footing").isVisible();
  check("footing field group visible", fGroup);

  // Column: d=12in (1ft) x 4ft tall = pi*0.5^2*4 = 3.1416 cuft = 0.116 yd3
  await page.click('[data-vshape="column"]');
  await page.waitForTimeout(250);
  yd = await page.textContent("#v-cuyd");
  check("column d=1ft x 4ft = 0.12 yd3", yd.includes("0.12"), yd);

  // Wall: 20ft x 8in x 4ft = 20 * 0.667 * 4 = 53.3 cuft = 1.98 yd3
  await page.click('[data-vshape="wall"]');
  await page.waitForTimeout(250);
  yd = await page.textContent("#v-cuyd");
  check("wall 20ft x 8in x 4ft = 1.98 yd3", yd.includes("1.98"), yd);

  // Stairs: run 12, rise 6, width 4 = 4 * (12/2) * 6 = 144 cuft = 5.33 yd3 + landing 4*4*0.333=5.33 => 149.33 = 5.53 yd3
  await page.click('[data-vshape="stairs"]');
  await page.waitForTimeout(250);
  yd = await page.textContent("#v-cuyd");
  check("stairs run12 rise6 w4 + landing = 5.53 yd3", yd.includes("5.53"), yd);

  // Round pad
  await page.click('[data-vshape="circle"]');
  await page.waitForTimeout(250);
  const area = await page.textContent("#v-area");
  check("round pad d=12ft = 113 sq ft", area.startsWith("113"), area);

  // 50 lb bags
  await page.click('[data-vshape="rect"]');
  await page.fill("#v-length", "10");
  await page.fill("#v-width", "10");
  await page.waitForTimeout(250);
  const b50 = await page.textContent("#v-bags50");
  const b80 = await page.textContent("#v-bags80");
  check("50 lb bags for 10x10 = 98", b50.includes("98"), b50);
  check("80 lb bags for 10x10 = 62", b80.includes("62"), b80);
  await page.close();
}

/* ---------- B. Metric toggle ---------- */
console.log("\n═══ METRIC / IMPERIAL TOGGLE ═══");
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("pageerror", (e) => errors.push("metric: " + e.message));
  await page.goto("http://localhost:8160/concrete-calculator.html", { waitUntil: "networkidle" });

  await page.click('label[for="vsys-metric"]');
  await page.waitForTimeout(300);
  const unitLabel = await page.textContent("#v-length ~ .unit, .input-wrap:has(#v-length) .unit");
  check("length unit switches to m", unitLabel.trim() === "m", unitLabel);

  // 6.096m x 6.096m x 10.16cm should still be ~4.94 yd3 (20x20x4in)
  await page.fill("#v-length", "6.096");
  await page.fill("#v-width", "6.096");
  await page.fill("#v-thickness", "10.16");
  await page.waitForTimeout(300);
  const yd = await page.textContent("#v-cuyd");
  check("metric 6.096m x 6.096m x 10.16cm = 4.94 yd3", yd.includes("4.94"), yd);

  await page.click('label[for="vsys-imperial"]');
  await page.waitForTimeout(300);
  const back = await page.textContent("#v-cuyd");
  check("switch back to imperial recalculates", back.includes("4.94"), back);
  await page.close();
}

/* ---------- C. Calculator above the fold ---------- */
console.log("\n═══ CALCULATOR POSITION (fold) ═══");
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto("http://localhost:8160/", { waitUntil: "networkidle" });
  const box = await page.locator("#calc-form").boundingBox();
  check("first input visible within 900px viewport", box.y < 900, `form starts at y=${Math.round(box.y)}`);

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mob.goto("http://localhost:8160/", { waitUntil: "networkidle" });
  const mBox = await mob.locator("#calc-form").boundingBox();
  const h1Box = await mob.locator("h1").boundingBox();
  check("mobile: H1 appears before calculator", mBox.y > h1Box.y, `h1 y=${Math.round(h1Box.y)}, form y=${Math.round(mBox.y)}`);
  check("mobile: calculator within first 2 screens", mBox.y < 1700, `form y=${Math.round(mBox.y)}`);
  await mob.close();
  await page.close();
}

/* ---------- D. FAQ nav + counts ---------- */
console.log("\n═══ FAQ STRUCTURE ═══");
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("pageerror", (e) => errors.push("faq: " + e.message));
  await page.goto("http://localhost:8160/faq.html", { waitUntil: "networkidle" });
  const n = await page.locator("#faq-list details.faq-item").count();
  check("FAQ hub has 99 questions", n === 99, `${n}`);
  const navLinks = await page.locator(".faq-nav a").count();
  check("FAQ hub has jump-nav links", navLinks >= 20, `${navLinks} links`);

  // jump nav target must exist
  const bad = [];
  for (const href of await page.locator(".faq-nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
    if (!(await page.locator(href).count())) bad.push(href);
  }
  check("every jump-nav link resolves", bad.length === 0, bad.join(", "));

  const schema = await page.evaluate(() => {
    const s = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((x) => { try { return JSON.parse(x.textContent); } catch { return null; } })
      .find((x) => x && x["@type"] === "FAQPage");
    return s;
  });
  check("schema matches visible FAQ count", schema.mainEntity.length === n, `schema=${schema.mainEntity.length} visible=${n}`);
  await page.close();
}

/* ---------- E. Magic number strip + trust row ---------- */
console.log("\n═══ NEW SECTIONS ═══");
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto("http://localhost:8160/concrete-calculator.html", { waitUntil: "networkidle" });
  check("magic number strip present", await page.locator(".magic__num").count() === 1);
  const magic = await page.textContent(".magic__num");
  check("magic number is 81", magic.trim() === "81", magic);
  check("quick answers cards present", await page.locator(".grid-3 .card").count() >= 3);
  check("trust row present", await page.locator(".trust-row").count() >= 1);
  await page.close();

  const p2 = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await p2.goto("http://localhost:8160/", { waitUntil: "networkidle" });
  check("homepage trust row present", await p2.locator(".trust-row").count() >= 1);
  check("homepage worked-example table present", await p2.locator("table").count() >= 1);
  const wordCount = await p2.evaluate(() => document.body.innerText.split(/\s+/).length);
  check("homepage still 2500+ words", wordCount > 2500, `${wordCount} words`);
  await p2.close();
}

console.log("\n═══ PAGE ERRORS ═══");
console.log(errors.length ? errors.join("\n") : "  none");
console.log("\n═══ SUMMARY ═══");
console.log(fail.length ? `FAILED: ${fail.join(" | ")}` : "ALL CHECKS PASSED");
await browser.close();
server.close();
