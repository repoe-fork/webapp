import { test, expect, waitForCascadingLoads } from "./fixtures";

test("investigate boss matching", async ({ page }) => {
  const url = "/?tab=areas&area=G1_2&game=poe2&graph=Metadata%2FTerrain%2FGallows%2FAct1%2F1_2%2FGraphs%2Ffelling_N_S_E.tgr&room=boss&roomFile=Metadata%2FTerrain%2FGallows%2FAct1%2F1_2%2FRooms%2FUnique%2Fboss_hagwitch_1.arm";
  await page.goto(url);
  await waitForCascadingLoads(page);

  // Check if there are slots that don't have matched tiles.
  // In Tile component, if no matches, it returns null.
  // The Room component renders a rect for every cell.
  // We can look for the title attribute in rects to find 'k' slots.

  const slots = page.locator("polygon title, rect title");
  const count = await slots.count();
  console.log(`Found ${count} slots`);

  let kSlots = 0;
  let matchedTiles = 0;

  for (let i = 0; i < count; i++) {
    const text = await slots.nth(i).textContent();
    if (text?.includes("- k")) {
      kSlots++;
    }
  }

  const unmatched = page.locator("circle[fill='red'] title");
  const unmatchedCount = await unmatched.count();
  console.log(`Unmatched red indicators: ${unmatchedCount}`);
  for (let i = 0; i < unmatchedCount; i++) {
    console.log(`Unmatched Slot ${i} reasons: ${await unmatched.nth(i).textContent()}`);
  }

  const selects = page.locator("select");
  matchedTiles = await selects.count();

  console.log(`K-slots: ${kSlots}, Matched tiles: ${matchedTiles}`);

  // We expect more matches.
  // expect(matchedTiles).toBe(kSlots); // This might fail currently
});
