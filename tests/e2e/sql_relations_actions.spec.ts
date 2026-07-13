import { test, expect } from "./fixtures";

test("sql relations table actions: → (source row) and ← (referencing source)", async ({ page }) => {
  await page.goto("/webapp/?tab=sql&game=poe2");

  // Wait for loading to finish
  await expect(page.getByText("Loading...")).not.toBeVisible({ timeout: 60000 });

  const editor = page.getByTestId("sql-editor").locator(".cm-content");
  const runQueryBtn = page.getByRole("button", { name: "Run Query" });
  
  // 1. Query relations table
  const sql = "SELECT * FROM relations LIMIT 1";
  await editor.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(sql);
  await runQueryBtn.click();
  
  await expect(page.locator("table")).toBeVisible();
  
  // Wait for headers to be sure it's loaded
  await expect(page.locator("table th").first()).toHaveText("source_table", { timeout: 30000 });
  
  // Wait for some data to appear
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toBeVisible();
  
  const sourceTable = await firstRow.locator("td").nth(0).textContent();
  const sourceRow = await firstRow.locator("td").nth(2).textContent();
  
  console.log(`Testing relations actions for source ${sourceTable} row ${sourceRow}`);
  
  // 2. Click → (Find target row) - should now go to SOURCE table
  const targetBtn = firstRow.getByTitle("Find related (target) row");
  await targetBtn.hover(); // Hover to make it visible
  await targetBtn.click();
  
  // Check URL.
  await expect(page).toHaveURL(new RegExp(`sql=SELECT.+FROM.+${sourceTable}.+WHERE.+rowid.+${sourceRow}`));
  
  // 3. Go back and click ← (Find referencing rows) - should now find references to SOURCE table
  await page.goBack();
  await expect(page.locator("table th").first()).toHaveText("source_table", { timeout: 15000 });
  
  const refBtn = page.locator("tbody tr").first().getByTitle("Find referencing rows");
  await refBtn.hover(); // Hover to make it visible
  await refBtn.click();
  
  await expect(page).toHaveURL(new RegExp(`sql=SELECT.+FROM.+relations.+WHERE.+target_table.+${sourceTable}.+target_row.+${sourceRow}`));
});
