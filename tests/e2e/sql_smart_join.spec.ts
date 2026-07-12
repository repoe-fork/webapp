import { test, expect } from "./fixtures";

test("sql smart join autocompletion", async ({ page }) => {
  page.on("console", (msg) => console.log(`Browser console: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`Browser error: ${err}`));

  await page.goto("/webapp/?tab=sql&game=poe2");

  const editor = page.getByTestId("sql-editor");
  
  // Wait for schema and relations to be loaded
  await expect(editor).toHaveAttribute("data-schema-loaded", "true", { timeout: 30000 });
  await expect(editor).toHaveAttribute("data-relations-loaded", "true", { timeout: 30000 });

  const content = editor.locator(".cm-content");
  
  // Focus and clear
  await content.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await expect(content).toHaveText("");

  // Type a query that should trigger smart join
  const query = 'SELECT * FROM AbyssMonsterModReplacement JOIN ';
  await page.keyboard.type(query, { delay: 100 });
  
  // Wait for suggestion to appear
  const suggestion = page.locator(".cm-tooltip-autocomplete");
  await expect(suggestion).toBeVisible({ timeout: 15000 });
  
  // Type enough to pick one of our suggestions
  await page.keyboard.type("via rel", { delay: 100 });
  
  // Select it
  await page.keyboard.press("Enter");
  
  // Verify editor contains the full smart join SQL
  const text = await content.innerText();
  expect(text).toContain("JOIN relations");
  expect(text).toContain(".source_table = 'AbyssMonsterModReplacement'");
});
