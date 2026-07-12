import { test, expect } from "./fixtures";

test("sql basic autocompletion", async ({ page }) => {
  page.on("console", (msg) => console.log(`Browser console: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`Browser error: ${err}`));

  await page.goto("/webapp/?tab=sql&game=poe2");

  const editor = page.getByTestId("sql-editor");
  
  // Wait for schema to be loaded
  await expect(editor).toHaveAttribute("data-schema-loaded", "true", { timeout: 30000 });

  const content = editor.locator(".cm-content");
  
  // Focus and clear
  await content.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await expect(content).toHaveText("");

  // 1. Test table autocompletion
  await page.keyboard.type("SELECT * FROM ", { delay: 100 });
  await page.keyboard.type("Mod", { delay: 100 });
  
  const suggestion = page.locator(".cm-tooltip-autocomplete");
  await expect(suggestion).toBeVisible({ timeout: 15000 });
  // Should see 'Mods' among suggestions
  await expect(suggestion).toContainText("Mods");
  
  // Use arrow keys to select if needed, but Enter usually picks the top one
  // Let's type 's' to be more specific
  await page.keyboard.type("s", { delay: 100 });
  
  // Wait for it to be even more specific
  await expect(suggestion).toContainText("Mods");
  await page.keyboard.press("Enter");
  
  const text = await content.innerText();
  expect(text.toLowerCase()).toContain("mods");

  // 2. Test column autocompletion
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("SELECT rowid FROM Mods WHERE ", { delay: 100 });
  await page.keyboard.type("L", { delay: 100 });
  
  await expect(suggestion).toBeVisible({ timeout: 15000 });
  // 'Mods' table has columns like 'Id', 'Name', 'Level'
  await expect(suggestion).toContainText("Level");
  
  await page.keyboard.type("evel", { delay: 100 });
  await page.keyboard.press("Enter");
  
  const textAfterCol = await content.innerText();
  expect(textAfterCol.toLowerCase()).toContain("level");
});
