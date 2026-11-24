/* Visual + functional smoke test using Playwright */
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
    const file = path.join(DIST, p);
    const buf = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end("not found");
  }
});
await new Promise((r) => server.listen(8099, r));

const browser = await chromium.launch({ executablePath: chromiumPath(), args: ["--no-sandbox","--disable-dev-shm-usage"] });
const errors = [];
const pages = ["index", "concrete-calculator", "cost-per-square-foot", "ready-mix-vs-bags", "driveway-cost", "patio-cost", "rebar-calculator", "faq", "about"];

for (const name of pages) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${name}] console: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  await page.goto(`http://localhost:8099/${name === "index" ? "" : name + ".html"}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);

  const faqCount = await page.locator("#faq-list details.faq-item").count();
  const headline = await page.locator("#headline-value, #v-cuyd, #sqft-typ, #cmp-savings, #d-total-typ, #p-total-typ, #r-ft").first().textContent().catch(() => "n/a");
  const schemas = await page.locator('script[type="application/ld+json"]').count();
  const h1 = await page.locator("h1").first().textContent();
  const title = await page.title();

  console.log(`\n── ${name}`);
  console.log(`   title: ${title.slice(0, 72)}`);
  console.log(`   h1:    ${h1.trim().slice(0, 72)}`);
  console.log(`   faq items: ${faqCount} | json-ld blocks: ${schemas} | headline: ${(headline || "").trim()}`);

  await page.screenshot({ path: path.join(__dirname, "shots", `${name}.png`), fullPage: false });
  await page.screenshot({ path: path.join(__dirname, "shots", `${name}-full.png`), fullPage: true });
  await page.close();
}

console.log("\n=== ERRORS ===");
console.log(errors.length ? errors.join("\n") : "none");
await browser.close();
server.close();
