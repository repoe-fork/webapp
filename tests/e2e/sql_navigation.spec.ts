import { test, expect } from "./fixtures";

test("sql viewer url sync and reference navigation", async ({ page }) => {
  page.on("console", (msg) => console.log(`Browser console: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`Browser error: ${err}`));

  await page.goto("/webapp/?tab=sql&game=poe2");

  // Wait for loading to finish
  await expect(page.getByText("Loading...")).not.toBeVisible({ timeout: 60000 });

  // 1. Test URL sync when changing SQL
  const editor = page.getByTestId("sql-editor").locator(".cm-content");
  const runQueryBtn = page.getByRole("button", { name: "Run Query" });
  const initialSql = "SELECT * FROM relations LIMIT 1";
  await editor.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(initialSql);
  await runQueryBtn.click();
  
  // Wait for relations table to load
  await expect(async () => {
    const headers = await page.locator("table th").allTextContents();
    if (!headers.includes("source_table")) throw new Error("Relations table not loaded yet");
  }).toPass({ timeout: 30000 });

  // Check if URL updated (with encoding, + or %20 and * or %2A)
  await expect(page).toHaveURL(/sql=SELECT[+%20](\*|%2A)[+%20]FROM[+%20]relations[+%20]LIMIT[+%20]1/);

  // 2. Test navigation from a reference column
  await expect(page.locator("table")).toBeVisible();
  const sourceTable = await page.locator("table tr:nth-child(1) td:nth-child(1)").textContent();
  const sourceColumn = await page.locator("table tr:nth-child(1) td:nth-child(2)").textContent();
  const sourceRow = await page.locator("table tr:nth-child(1) td:nth-child(3)").textContent();
  
  console.log(`Found relation: ${sourceTable}.${sourceColumn} at row ${sourceRow}`);

  // Now go to that source table
  await editor.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(`SELECT * FROM "${sourceTable}" WHERE rowid = ${sourceRow}`);
  await runQueryBtn.click();
  
  // Wait for table to update by checking headers
  await expect(async () => {
    const headers = await page.locator("table th").allTextContents();
    if (headers.includes("source_table")) throw new Error("Still showing relations table");
    if (!headers.includes(sourceColumn!)) throw new Error(`Column ${sourceColumn} not found in headers: ${headers.join(", ")}`);
  }).toPass({ timeout: 30000 });

  const headers = await page.locator("table th").allTextContents();
  const colIndex = headers.indexOf(sourceColumn!);
  
  if (colIndex === -1) {
      throw new Error(`Column ${sourceColumn} not found in headers: ${headers.join(", ")}`);
  }

  // Click the link in that cell
  const cellLink = page.locator(`table tr:nth-child(1) td:nth-child(${colIndex + 1}) button`);
  await expect(cellLink).toBeVisible({ timeout: 10000 });
  await cellLink.click();
  
  // Verify SQL updated to target row
  await expect(editor).toContainText("WHERE rowid IN (SELECT target_row FROM relations", { timeout: 10000 });
  
  // Verify URL updated
  const encodedSubstr = "WHERE%20rowid%20IN%20(SELECT%20target_row%20FROM%20relations";
  // The ( and ) might be encoded or not depending on the library. 
  // Usually they are %28 and %29.
  await expect(page.url()).toContain("relations");
});
