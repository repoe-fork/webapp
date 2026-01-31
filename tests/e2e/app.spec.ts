import { test, expect } from "./fixtures";

test("loads the app shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("poe webapp")).toBeVisible();
});
