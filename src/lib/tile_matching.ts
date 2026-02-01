import { TDTActual } from "./tdt";
import { ARMSlot } from "./arm";

export enum TileSide {
  Left = 0,
  Bottom = 1,
  Right = 2,
  Top = 3,
}

export enum TileCorner {
  TopLeft = 0,
  BottomLeft = 1,
  BottomRight = 2,
  TopRight = 3,
}

export interface EdgeIndex {
  real: number;
  virtual: number;
}

export class TileKey {
  offsets: EdgeIndex[] = [];
  edge_types: (string | null)[] = [];
  ground_types: (string | null)[] = [];
  height: number[] = [];
  tag: string | null = null;
  size: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    for (let i = 0; i < 4; i++) {
      this.offsets.push({ real: 0, virtual: 0 });
      this.edge_types.push(null);
      this.ground_types.push(null);
      this.height.push(0);
    }
  }

  static fromTDT(tdt: TDTActual): TileKey {
    const key = new TileKey();
    const remap = [TileSide.Bottom, TileSide.Right, TileSide.Top, TileSide.Left];

    for (let i = 0; i < 4; i++) {
      const side = remap[i];
      key.offsets[side] = { real: tdt.offsets[i], virtual: tdt.offsets[4 + i] };
      key.edge_types[side] = tdt.edge_types[i];
      key.ground_types[side] = tdt.ground_types[i];
    }

    if (tdt.heights.length > 0) {
      const rightCol = tdt.dim.x;
      const topRow = tdt.dim.y;
      const rowStride = tdt.dim.x + 1;
      key.height[TileCorner.TopLeft] = tdt.heights[topRow * rowStride];
      key.height[TileCorner.BottomLeft] = tdt.heights[0];
      key.height[TileCorner.BottomRight] = tdt.heights[rightCol];
      key.height[TileCorner.TopRight] = tdt.heights[topRow * rowStride + rightCol];
    }

    key.tag = tdt.tag;
    key.size = { ...tdt.dim };
    return key;
  }

  static fromSlot(slot: ARMSlot): TileKey {
    const key = new TileKey();
    const sideMap = { n: TileSide.Top, e: TileSide.Right, s: TileSide.Bottom, w: TileSide.Left };
    const cornerMap = {
      nw: TileCorner.TopLeft,
      sw: TileCorner.BottomLeft,
      se: TileCorner.BottomRight,
      ne: TileCorner.TopRight,
    };

    for (const [s, side] of Object.entries(sideMap)) {
      const edge = slot.edges[s as keyof typeof sideMap];
      const sideKey = s as "n" | "e" | "s" | "w";
      const isVertical = sideKey === "w" || sideKey === "e";
      const limitIdx = isVertical ? slot.height * 3 : slot.width * 3;

      if (edge.edge && edge.exit !== limitIdx) {
        key.edge_types[side] = edge.edge;
        key.offsets[side] = { real: edge.exit, virtual: edge.virtual_exit };
      } else {
        key.edge_types[side] = null;
        key.offsets[side] = { real: 0, virtual: 0 };
      }
    }

    for (const [c, corner] of Object.entries(cornerMap)) {
      const g = slot.corners[c as keyof typeof cornerMap];
      key.ground_types[corner] = g.ground;
      key.height[corner] = g.height;
    }

    key.tag = slot.tile_tag || null;
    key.size = { x: slot.width, y: slot.height };
    return key;
  }

  flipped(flip = true): TileKey {
    if (!flip) return this;
    const ret = new TileKey();
    ret.tag = this.tag;
    ret.size = { ...this.size };

    const swap = (arr: any[], i: number, j: number) => {
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    };

    ret.offsets = this.offsets.map((v) => ({ ...v }));
    swap(ret.offsets, TileSide.Left, TileSide.Right);

    const flipValue = (side: TileSide, length: number) => {
      const val = ret.offsets[side];
      if (val.real !== length * 3) val.real = length * 3 - 1 - val.real;
      if (val.virtual !== length * 3) val.virtual = length * 3 - 1 - val.virtual;
    };

    flipValue(TileSide.Left, ret.size.y);
    flipValue(TileSide.Right, ret.size.y);
    flipValue(TileSide.Top, ret.size.x);
    flipValue(TileSide.Bottom, ret.size.x);

    ret.edge_types = [...this.edge_types];
    swap(ret.edge_types, TileSide.Left, TileSide.Right);

    ret.ground_types = [...this.ground_types];
    swap(ret.ground_types, TileCorner.TopLeft, TileCorner.TopRight);
    swap(ret.ground_types, TileCorner.BottomLeft, TileCorner.BottomRight);

    ret.height = [...this.height];
    swap(ret.height, TileCorner.TopLeft, TileCorner.TopRight);
    swap(ret.height, TileCorner.BottomLeft, TileCorner.BottomRight);

    return ret;
  }

  rotated(rot: number): TileKey {
    if (rot === 0) return this;
    const ret = new TileKey();
    ret.tag = this.tag;
    ret.size = { ...this.size };

    let quarters = 0;
    switch (rot) {
      case 90:
        quarters = 3;
        [ret.size.x, ret.size.y] = [ret.size.y, ret.size.x];
        break;
      case 180:
        quarters = 2;
        break;
      case 270:
        quarters = 1;
        [ret.size.x, ret.size.y] = [ret.size.y, ret.size.x];
        break;
    }

    const rotateArray = (arr: any[]) => {
      const result = [...arr];
      for (let i = 0; i < quarters; i++) {
        result.push(result.shift());
      }
      return result;
    };

    ret.offsets = rotateArray(this.offsets);
    ret.edge_types = rotateArray(this.edge_types);
    ret.ground_types = rotateArray(this.ground_types);
    ret.height = rotateArray(this.height);

    return ret;
  }
}

export interface SlotFitResult {
  success: boolean;
  failureReason: string;
}

export function fitsInSlot(tile: TileKey, slot: TileKey): SlotFitResult {
  const reasons: string[] = [];

  if (slot.tag && tile.tag !== slot.tag) {
    reasons.push("Tag mismatch");
  }

  if (tile.size.x !== slot.size.x || tile.size.y !== slot.size.y) {
    reasons.push("Size mismatch");
  }

  if (reasons.length > 0) return { success: false, failureReason: reasons.join("\n") };

  const isWild = (s: string | null) =>
    s !== null && (s.includes("WildcardEdge") || s.toLowerCase().includes("wildcard"));

  for (let i = 0; i < 4; i++) {
    const tileEt = tile.edge_types[i];
    const slotEt = slot.edge_types[i];
    const eitherWild = isWild(tileEt) || isWild(slotEt);

    if (tileEt && slotEt) {
      if (
        !eitherWild &&
        (tileEt !== slotEt ||
          tile.offsets[i].real !== slot.offsets[i].real ||
          tile.offsets[i].virtual !== slot.offsets[i].virtual)
      ) {
        reasons.push(`Edge index mismatch on side ${i}`);
      }
    } else if (tileEt || slotEt) {
      if (!eitherWild) {
        reasons.push(`Sole edge not wildcard on side ${i}`);
      }
    }
  }

  for (let i = 0; i < 4; i++) {
    const tileGt = tile.ground_types[i];
    const slotGt = slot.ground_types[i];
    if (tileGt && slotGt) {
      if (tileGt !== slotGt) {
        reasons.push(`Ground mismatch on corner ${i}`);
      }
    } else if (slotGt && !tileGt) {
      // Slot requires ground, but tile doesn't have it
      reasons.push(`Ground missing on corner ${i}`);
    }
    // Note: We allow tile to have ground even if slot doesn't specify it.
  }

  let commonDelta: number | null = null;
  for (let i = 0; i < 4; i++) {
    const delta = slot.height[i] - tile.height[i];
    if (commonDelta === null) {
      commonDelta = delta;
    } else if (delta !== commonDelta) {
      reasons.push(`Corner height delta mismatch on corner ${i}`);
    }
  }

  return {
    success: reasons.length === 0,
    failureReason: reasons.join("\n"),
  };
}
