import { test, expect } from "./fixtures";

test("sql ui refinement: language dropdown, explicit updates, and history", async ({ page }) => {
  await page.goto("/webapp/?tab=sql&game=poe2");

  const searchWidget = page.getByTestId("search-widget");
  const langDropdown = searchWidget.locator("select");
  const searchInput = searchWidget.locator("input");
  const runQueryBtn = searchWidget.getByRole("button", { name: "Run Query" });
  
  // 1. Verify language dropdown
  await expect(langDropdown).toBeVisible();
  await expect(langDropdown.locator("option")).toHaveCount(10); // English, French, German, etc.
  await expect(langDropdown).toHaveValue("English");

  // 2. Verify explicit updates
  const editor = page.getByTestId("sql-editor").locator(".cm-content");
  const initialUrl = page.url();
  
  // Type in editor - should NOT update URL
  await editor.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("SELECT * FROM Mods LIMIT 5");
  
  // Wait a bit to ensure debounce wouldn't have triggered (though we removed it)
  await page.waitForTimeout(1500);
  expect(page.url()).toBe(initialUrl);

  // Click Run Query - should update URL
  await runQueryBtn.click();
  await expect(page).toHaveURL(/sql=SELECT(\+|%20).+Mods(\+|%20)LIMIT(\+|%20)5/);
  const urlAfterRun = page.url();

  // Search Text - should update URL
  await searchInput.fill("testing the game");
  await runQueryBtn.click();
  await expect(page).toHaveURL(/sql=SELECT(\+|%20).+(%22|")?English(%22|")?(\+|%20)WHERE(\+|%20).+MATCH(\+|%20)(%27|')testing(\+|%20)the(\+|%20)game(%27|')/);
  const urlAfterSearch = page.url();

  // 3. Verify history (Back button)
  await page.goBack();
  expect(page.url()).toBe(urlAfterRun);
  
  // Wait for editor to update
  await expect(editor).toContainText("SELECT * FROM Mods LIMIT 5");

  await page.goBack();
  expect(page.url()).toBe(initialUrl);
  await expect(editor).toContainText('SELECT * FROM "English"');
  
  // 4. Verify row actions with 'table' column
  await page.goForward(); 
  await page.goForward(); // Go forward to urlAfterSearch
  await expect(page).toHaveURL(urlAfterSearch);
  await expect(page.locator("table")).toBeVisible();
  
  // Wait for search results to load
  await expect(page.locator("table")).toContainText("BuffDefinitions", { timeout: 15000 });
  
  // The 'English' search result has a 'table' column
  const tableHeader = page.locator("th").filter({ hasText: "table" });
  await expect(tableHeader).toBeVisible();

  // Click a row action in the English search results
  // Find a row where 'table' is 'BuffDefinitions'
  const targetRow = page.locator("tr").filter({ hasText: "BuffDefinitions" }).first();
  await expect(targetRow).toBeVisible();
  
  const targetBtn = targetRow.getByTitle("Find related (target) row");
  await targetBtn.click();
  
  // Should navigate to SELECT * FROM Stats WHERE rowid = ...
  // (Because BuffDefinitions row 95's first relation is to Stats)
  await expect(page).toHaveURL(/sql=SELECT(\+|%20).+WHERE(\+|%20)rowid(\+|%20)(%3D|=)/);
});
