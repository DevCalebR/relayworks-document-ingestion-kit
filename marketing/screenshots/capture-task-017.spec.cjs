const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const rawDir = path.join(root, "marketing/screenshots/raw");
const finalDir = path.join(root, "marketing/screenshots/final");
const sample = path.join(root, "storage/sample/NIST.AI.600-1-sample.pdf");

async function run() {
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(finalDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(30000);

  async function settle() {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(350);
  }

  async function capture(name) {
    await settle();
    await page.screenshot({ path: path.join(rawDir, name), fullPage: true });
    await page.screenshot({ path: path.join(finalDir, name), fullPage: false });
    console.log(`captured ${name}`);
  }

  async function clickTab(name) {
    await page.locator(".workspace-tabs").getByRole("button", { name }).click();
    await settle();
  }

  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await capture("01-homepage.png");

  await page.locator("#converter").scrollIntoViewIfNeeded();
  await settle();
  await capture("02-goal-selection.png");

  await page.locator('input[type="file"]').first().setInputFiles(sample);
  await page.getByText("NIST.AI.600-1-sample.pdf", { exact: false }).waitFor({ state: "visible" });
  await capture("03-upload-ready.png");

  await page.getByRole("button", { name: "Process Document" }).click();
  await page.locator(".status-box").waitFor({ state: "visible", timeout: 120000 });
  await page.locator("#result-title").scrollIntoViewIfNeeded();
  await capture("04-job-processing.png");

  await page.getByText("package is ready", { exact: false }).waitFor({ state: "visible", timeout: 360000 });
  await capture("05-conversion-complete.png");

  await clickTab("Markdown");
  await capture("06-markdown-output.png");

  await clickTab("Rendered Preview");
  await capture("07-rendered-preview.png");

  await clickTab("Structured JSON");
  await capture("08-structured-json.png");

  await clickTab("Processing Report");
  await capture("09-processing-report.png");

  await clickTab("Images");
  await page.locator(".image-grid img").first().waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll(".image-grid img")).filter((img) => img.complete && img.naturalWidth > 0).length >= 2,
    { timeout: 30000 },
  );
  await capture("10-extracted-images.png");

  await clickTab("Processing Report");
  await capture("11-download-package.png");

  await page.goto("http://localhost:8000/docs", { waitUntil: "networkidle" });
  await page.getByText("/jobs/convert", { exact: false }).waitFor({ state: "visible", timeout: 30000 });
  await capture("12-api-or-architecture-proof.png");

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
