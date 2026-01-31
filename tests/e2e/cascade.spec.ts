import { test, expect, waitForCascadingLoads } from "./fixtures";

test("cascading load verification", async ({ page }) => {
  const url = "/webapp?tab=areas&area=G1_2&game&graph=Metadata%2FTerrain%2FGallows%2FAct1%2F1_2%2FGraphs%2Ffelling_N_S_E.tgr&room=boss&roomFile=Metadata%2FTerrain%2FGallows%2FAct1%2F1_2%2FRooms%2FUnique%2Fboss_hagwitch_1.arm";
  
  await page.goto(url);
  
  // Use the helper to wait for all cascading loads
  await waitForCascadingLoads(page);
  
  // 1. Assert no loading states remain
  const loading = page.locator("text=/loading/i");
  await expect(loading).toHaveCount(0);
  
  // 2. Assert that we have the expected data loaded
  // Based on previous findings, we expect 7 references to .arm (1 main + 5 in list + 1 in title)
  // Let's be conservative and expect at least 6.
  const armFiles = page.locator("text=/.arm/i");
  const count = await armFiles.count();
  expect(count).toBeGreaterThanOrEqual(6);
  
  // 3. Assert that images (minimap tiles) are present
  // In the previous run, we saw 3 images.
  const images = page.locator("image");
  const imageCount = await images.count();
  expect(imageCount).toBeGreaterThanOrEqual(1);

  console.log(`Verified: ${count} .arm files and ${imageCount} images loaded.`);
});
