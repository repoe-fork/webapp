import { test, expect, waitForCascadingLoads } from "./fixtures";

test("poe1 area viewer load verification", async ({ page }) => {
  const url =
    "/webapp?tab=areas&area=1_1_town&game=poe1&graph=Metadata%2FTerrain%2FAct1%2FTown%2FGraphs%2Fbeachtown.dgr&room=beachtown&roomFile=Metadata%2FTerrain%2FAct1%2FTown%2FRooms%2Fbeach_town_unique_normal.arm";

  await page.goto(url);

  await waitForCascadingLoads(page);

  const loading = page.locator("text=/loading/i");
  await expect(loading).toHaveCount(0);

  const armFiles = page.locator("text=/.arm/i");
  const count = await armFiles.count();
  expect(count).toBeGreaterThanOrEqual(1);

  console.log(`Verified PoE 1 area load.`);
});
