import { test, expect } from "./fixtures";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("sqlite viewer fallback and progress", async ({ page }) => {
  page.on("console", (msg) => console.log(`Browser console: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`Browser error: ${err}`));

  // Use the local full database from public dir
  const dbPath = path.join(__dirname, "..", "..", "public", "poe2", "dat.sqlite");
  
  // Intercept the sqlite request
  await page.route("**/dat.sqlite", async (route) => {
    // Fail Range requests to trigger fallback
    if (route.request().headers()["range"]) {
      console.log("Aborting Range request to trigger fallback");
      await route.abort("failed");
      return;
    }

    console.log("Serving full database download");
    await route.continue();
  });

  await page.goto("/webapp/?tab=sql&game=poe2");

  // We expect to see the progress message
  await expect(page.getByText(/Downloading database:/)).toBeVisible();
  
  // Eventually it should load
  await expect(page.getByRole("button", { name: "Search" })).toBeVisible({ timeout: 60000 });
  
  // Verify it actually works by running a query
  await page.getByTestId("sql-editor").locator(".cm-content").fill("SELECT * FROM English LIMIT 1");
  
  await expect(page.locator("table")).toBeVisible();
  await expect(page.locator("table")).toContainText("Moeanu", { caseSensitive: false });
});
