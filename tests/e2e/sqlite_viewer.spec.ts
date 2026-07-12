import { test, expect } from "./fixtures";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("sqlite viewer loads and basic interaction", async ({ page }) => {
  page.on("console", (msg) => console.log(`Browser console: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`Browser error: ${err}`));

  const filePath = path.join(__dirname, "..", "fixtures", "test.sqlite");
  if (!fs.existsSync(filePath)) {
    // Create it if it doesn't exist for some reason
    const { execSync } = await import("child_process");
    execSync(`sqlite3 ${filePath} "CREATE VIRTUAL TABLE English USING fts5(content); INSERT INTO English (content) VALUES ('search for anything');"`);
  }
  const buffer = fs.readFileSync(filePath);

  // Mock the database and fail Range requests to force fallback (which supports FTS5 via fts5-sql-bundle)
  await page.route("**/dat.sqlite", async (route) => {
    if (route.request().headers()["range"]) {
      await route.abort("failed");
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/x-sqlite3",
      body: buffer,
      headers: {
        "content-length": buffer.length.toString(),
        "access-control-allow-origin": "*",
      }
    });
  });

  // Assuming a route exists to test the sqlite viewer
  // I'll need to figure out the correct URL for the viewer
  // Based on src/routes/sql.tsx, it seems like /sql might be the route
  await page.goto("/webapp/?tab=sql&game=poe2");

  // Wait for loading to finish
  await expect(page.getByText("Loading...")).not.toBeVisible({ timeout: 10000 });

  // Verify the search widget is present
  const searchWidget = page.getByLabel("Order by Rank");
  await expect(searchWidget).toBeVisible({ timeout: 10000 });

  // Perform search
  await page.getByPlaceholder("Table name").fill("English");
  await page.getByPlaceholder("Search query (FTS5)").fill("search");
  await page.getByRole("button", { name: "Search" }).click();

  // Verify result table appears
  const resultTable = page.locator("table");
  await expect(resultTable).toBeVisible({ timeout: 10000 });
});
