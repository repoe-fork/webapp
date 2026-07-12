import { test, expect } from "./fixtures";

test("sqlite viewer loads and basic interaction", async ({ page }) => {
  page.on("console", (msg) => console.log(`Browser console: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`Browser error: ${err}`));

  // Assuming a route exists to test the sqlite viewer
  // I'll need to figure out the correct URL for the viewer
  // Based on src/routes/sql.tsx, it seems like /sql might be the route
  await page.goto("/webapp/?tab=sql&game=poe2");

  // Wait for loading to finish
  await expect(page.getByText("Loading...")).not.toBeVisible({ timeout: 60000 });

  // Verify the search widget is present
  const searchButton = page.getByRole("button", { name: "Search" });
  await expect(searchButton).toBeVisible({ timeout: 10000 });

  // Perform search
  await page.getByPlaceholder("Table name").fill("English");
  await page.getByPlaceholder("Search query (FTS5)").fill("search");
  await page.getByRole("button", { name: "Search" }).click();

  // Verify result table appears
  const resultTable = page.locator("table");
  await expect(resultTable).toBeVisible({ timeout: 10000 });
});
