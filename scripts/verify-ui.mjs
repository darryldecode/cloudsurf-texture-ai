import fs from "node:fs/promises";
import path from "node:path";
import playwright from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL ?? "http://localhost:3001";
const screenshotPath = path.resolve("artifacts", "verify-ui.png");

await fs.mkdir(path.dirname(screenshotPath), { recursive: true });

const browser = await playwright.chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const consoleErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    consoleErrors.push(message.text());
  }
});

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /generate texture atlases for scenery production/i }).waitFor();
  await page.getByRole("link", { name: /login/i }).click();
  await page.waitForURL(/\/login/);
  await page.getByRole("heading", { name: /welcome back to your texture workspace/i }).waitFor();
  await page.getByRole("link", { name: /^continue$/i }).waitFor();

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/login/);
  await page.getByRole("heading", { name: /welcome back to your texture workspace/i }).waitFor();
  await page.screenshot({ path: screenshotPath, fullPage: true });

  if (consoleErrors.length) {
    throw new Error(`Console errors detected: ${consoleErrors.join(" | ")}`);
  }

  console.log(`UI verification passed. Screenshot: ${screenshotPath}`);
} finally {
  await browser.close();
}
