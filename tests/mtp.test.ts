import { describe, expect, it } from "vitest";
import { parseMTP } from "lib/mtp";
import { readFileSync } from "fs";
import { join } from "path";

describe("MTP Parser", () => {
  it("should parse a real .mtp file correctly", () => {
    const fixturePath = join(
      __dirname,
      "fixtures",
      "metadata_terrain_desert_buriedcity_citywall_2.mtp",
    );
    const content = readFileSync(fixturePath);

    const result = parseMTP(
      content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength),
    );

    expect(result.header.version).toBe(1);
    expect(result.header.recordCount).toBe(164);

    const firstRecord = result.records[0];
    expect(firstRecord.filename).toBe(
      "Metadata/Terrain/Desert/BuriedCity/Citywall_2/Overlay_Cc_01.tdt",
    );
    expect(result.records).toHaveLength(164);
  });
});
