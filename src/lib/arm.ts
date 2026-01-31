export interface ARMSlot {
  tag: "k";
  width: number;
  height: number;
  tile_tag: string | null;
  origin: "sw" | "se" | "ne" | "nw";
  edges: Record<
    "n" | "w" | "s" | "e",
    {
      edge: string | null;
      exit: number;
      virtual_exit: number;
    }
  >;
  corners: Record<
    "sw" | "se" | "ne" | "nw",
    {
      ground: string | null;
      height: number;
    }
  >;
}

export type ARMCell = ARMSlot | { tag: "f"; fill: string | null } | { tag: "s" | "o" | "n" };

export interface ARMFile {
  version: number;
  strings: string[];
  dims: number[];
  numbers: number[][];
  tag: string;
  pois: any[][];
  doodads: any[][];
  grid: ARMCell[][];
  root_slot: ARMSlot;
}

export function parseARM(text: string): ARMFile {
  if (!text) return {} as ARMFile;
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");

  let lineIdx = 0;

  const versionMatch = lines[lineIdx++].match(/^version ([0-9]+)$/);
  if (!versionMatch) throw new Error("Failed to find version");
  const version = parseInt(versionMatch[1]);

  const stringCount = parseInt(lines[lineIdx++]);
  const strings = lines
    .slice(lineIdx, lineIdx + stringCount)
    .map((s) => s.trim().replace(/^"|"$/g, ""));
  lineIdx += stringCount;

  const getString = (idx: number) => (idx > 0 && idx <= strings.length ? strings[idx - 1] : null);

  const dims = lines[lineIdx++].split(/\s+/).map(Number);
  const numbers: number[][] = [];
  numbers.push(lines[lineIdx++].split(/\s+/).map(Number));
  const tag = lines[lineIdx++].trim().replace(/^"|"$/g, "");
  numbers.push(lines[lineIdx++].split(/\s+/).map(Number));

  const parseSlot = (line: string): ARMSlot => {
    const vals = line
      .replace(/^\s*k\s/, "")
      .trim()
      .split(/\s+/)
      .map(Number);
    return {
      tag: "k",
      width: vals[0],
      height: vals[1],
      tile_tag: getString(vals[22]),
      origin: (["sw", "se", "ne", "nw"] as const)[vals[23] || 0],
      edges: {
        n: { edge: getString(vals[2]), exit: vals[6], virtual_exit: vals[7] },
        w: { edge: getString(vals[3]), exit: vals[8], virtual_exit: vals[9] },
        s: { edge: getString(vals[4]), exit: vals[10], virtual_exit: vals[11] },
        e: { edge: getString(vals[5]), exit: vals[12], virtual_exit: vals[13] },
      },
      corners: {
        sw: { ground: getString(vals[14]), height: vals[18] },
        se: { ground: getString(vals[15]), height: vals[19] },
        ne: { ground: getString(vals[16]), height: vals[20] },
        nw: { ground: getString(vals[17]), height: vals[21] },
      },
    };
  };

  const rootSlot = parseSlot(lines[lineIdx++]);

  const numCount = numbers[0].reduce((a, b) => a + b, 0) * 2;
  for (let i = 0; i < numCount; i++) {
    numbers.push(lines[lineIdx++].split(/\s+/).map(Number));
  }

  const reCell = /^\s*([kfson])((?:\s+-?\d+)*)(?:\s+[kfson].*)?\s*$/;

  const parsePois = () => {
    const result: any[][] = [];
    let group: any[] = [];
    while (lineIdx < lines.length) {
      const line = lines[lineIdx];
      if (reCell.test(line)) break;
      lineIdx++;

      const tokens = tokenize(line);
      if (tokens.length === 1) {
        if (line.trim().startsWith('"')) {
          result.push(group);
          return result;
        }
        const count = tokens[0];
        if (typeof count === "number" && count >= 0) {
          const poiSet = [];
          for (let i = 0; i < count; i++) {
            poiSet.push(tokenize(lines[lineIdx++]));
          }
          result.push(poiSet);
        } else if (count === -1) {
          result.push(group);
          group = [];
        }
      } else {
        group.push(tokens);
      }
    }
    if (group.length > 0) result.push(group);
    return result;
  };

  const pois = parsePois();

  const grid: ARMCell[][] = [];
  for (let y = 0; y < rootSlot.height; y++) {
    const row: ARMCell[] = [];
    let line = lines[lineIdx++];
    for (let x = 0; x < rootSlot.width; x++) {
      const match = line.match(/^\s*([kfson])((?:\s+-?\d+)*)(.*)$/);
      if (!match) throw new Error(`Unexpected cell format: ${line}`);
      const tag = match[1];
      const data = match[2].trim();
      line = match[3];

      if (tag === "k") {
        row.push(parseSlot(data));
      } else if (tag === "f") {
        row.push({ tag: "f", fill: getString(parseInt(data)) });
      } else {
        row.push({ tag: tag as "s" | "o" | "n" });
      }
    }
    grid.push(row);
  }

  const doodads = parsePois();

  return {
    version,
    strings,
    dims,
    numbers,
    tag,
    pois,
    doodads,
    grid,
    root_slot: rootSlot,
  };
}

function tokenize(line: string): any[] {
  const result: any[] = [];
  const reToken = /(-?\d+)|(-?\d*\.\d+)|"((?:[^"]|\\")*)"|(\S+)/g;
  let match;
  while ((match = reToken.exec(line)) !== null) {
    if (match[1] !== undefined) result.push(parseInt(match[1]));
    else if (match[2] !== undefined) result.push(parseFloat(match[2]));
    else if (match[3] !== undefined) result.push(match[3]);
    else if (match[4] !== undefined) result.push(match[4]);
  }
  return result;
}
