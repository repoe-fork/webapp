import { test, expect } from "./fixtures";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("sqlite viewer fallback and progress", async ({ page }) => {
  page.on("console", (msg) => console.log(`Browser console: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`Browser error: ${err}`));

  const filePath = path.join(__dirname, "..", "fixtures", "test.sqlite");
  if (!fs.existsSync(filePath)) {
    // Create it if it doesn't exist for some reason
    const { execSync } = await import("child_process");
    execSync(`sqlite3 ${filePath} "CREATE VIRTUAL TABLE English USING fts5(content); INSERT INTO English (content) VALUES ('search for anything');"`);
  }
  const realDb = fs.readFileSync(filePath);
  
  // Create a 50MB buffer and put the real DB at the start
  const buffer = Buffer.alloc(50 * 1024 * 1024);
  realDb.copy(buffer);

  // Intercept the sqlite request
  await page.route("**/dat.sqlite", async (route) => {
    // Fail Range requests to trigger fallback
    if (route.request().headers()["range"]) {
      console.log("Aborting Range request to trigger fallback");
      await route.abort("failed");
      return;
    }

    console.log("Serving full database download");
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

  await page.goto("/webapp/?tab=sql&game=poe2");

  // Verify that the fallback console message appeared (we can check console logs if needed)
  // But checking the UI is better.
  
  // We expect to see the progress message because 1MB should take a few frames at least
  // and we specifically check for its existence.
  await expect(page.getByText(/Downloading database:/)).toBeVisible();
  
  // Eventually it should load
  await expect(page.getByLabel("Order by Rank")).toBeVisible({ timeout: 15000 });
  
  // Verify it actually works by running a query
  await page.getByPlaceholder("Table name").fill("test");
  await page.getByPlaceholder("Search query (FTS5)").fill("");
  await page.getByRole("button", { name: "Search" }).click();
  
  // Since 'test' table doesn't have FTS5, this might fail if we use SearchWidget
  // Let's just use the direct SQL input if available.
  // In src/components/sql.tsx, children of SQLViewer is BasicInput by default.
  
  await page.locator("textarea").fill("SELECT * FROM English");
  // The Search button in SearchWidget might not be enough if it doesn't trigger runQuery for the textarea.
  // Actually, runQuery is in a useEffect that depends on 'sql'.
  
  await expect(page.locator("table")).toBeVisible();
  await expect(page.locator("table")).toContainText("search for anything");
});
