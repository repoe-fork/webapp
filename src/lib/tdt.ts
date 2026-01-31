export type TDTRef = {
  version: number;
  tag: string | null;
  tdt: string | null;
  strings: string[];
};

export type TDTActual = {
  version: number;
  tag: string | null;
  tgt: string | null;
  strings: string[];
  edge_types: (string | null)[];
  ground_types: (string | null)[];
  offsets: number[];
  dim: { x: number; y: number };
  heights: number[];
};

export type TDTFile = TDTRef | TDTActual;

export function parseTDT(buffer: ArrayBuffer): TDTFile {
  const view = new DataView(buffer);
  let offset = 0;

  const readUint32 = () => {
    if (offset + 4 > view.byteLength) throw new Error("Unexpected EOF while reading uint32");
    const value = view.getUint32(offset, true);
    offset += 4;
    return value;
  };

  const readUint16 = () => {
    if (offset + 2 > view.byteLength) throw new Error("Unexpected EOF while reading uint16");
    const value = view.getUint16(offset, true);
    offset += 2;
    return value;
  };

  const readUint8 = () => {
    if (offset + 1 > view.byteLength) throw new Error("Unexpected EOF while reading uint8");
    const value = view.getUint8(offset);
    offset += 1;
    return value;
  };

  const version = readUint32();
  const stringLength = readUint32();

  const byteLength = stringLength * 2;
  if (offset + byteLength > view.byteLength) {
    throw new Error("Unexpected EOF while reading string table");
  }
  const stringsRaw = new TextDecoder("utf-16le").decode(new Uint8Array(buffer, offset, byteLength));
  offset += byteLength;

  const readString = (start = readUint32()) => {
    if (start < 0 || start >= stringsRaw.length) return null;
    const end = stringsRaw.indexOf("\u0000", start);
    const value = end === -1 ? stringsRaw.slice(start) : stringsRaw.slice(start, end);
    return value.length ? value : null;
  };

  const tdtOffset = readUint32();
  const tdt = readString(tdtOffset);
  let tag: string | null = null;
  let tgt: string | null = null;

  if (tdt) {
    tag = readString(0);

    return {
      version,
      tag,
      tdt,
      strings: stringsRaw.split("\u0000"),
    };
  } else {
    tgt = readString();
    tag = readString();
  }

  const edge_types = [];
  for (let i = 0; i < 4; i++) {
    edge_types.push(readString());
  }

  let dim = { x: readUint8(), y: readUint8() };

  const ground_types = [];
  for (let i = 0; i < 4; i++) {
    ground_types.push(readString());
  }

  readUint16();
  readUint8();
  readUint8();

  const offsets = [];
  for (let i = 0; i < 8; i++) {
    offsets.push(readUint8());
  }

  let flags = 0;
  if (version > 3) {
    flags = readUint8();
    const subCount = readUint16();
    // Skip subTiles for now as we don't need them for basic matching
    // But we need to skip the correct amount of bytes...
    // This is complex because subTiles have variable size.
    // However, we can probably just seek to where gtGrid or tailBytes start if we knew their offsets.
    // Since we don't, we might need a more complete parser or just hope we don't need to skip too much.
    // Actually, poe-cpp parses them. Let's try to at least skip them.

    for (let i = 0; i < subCount; i++) {
      const type = readUint8();
      readUint8();
      switch (type) {
        case 0x00:
        case 0x02:
        case 0x09:
          offset += 23 * 23; // FixedBlock
          const len1 = readUint16();
          offset += len1; // VaryingBlock
          break;
        case 0x03:
        case 0x0b:
        case 0x1b:
          offset += 23 * 23; // FixedBlock
          break;
        case 0x04:
        case 0x06:
        case 0x0d:
          const len2 = readUint16();
          offset += len2; // VaryingBlock
          break;
        case 0x07:
        case 0x0f:
        case 0x1f:
          break;
      }
    }
  }

  if (flags & 0x10) {
    readUint32();
    offset += 6 * 4; // float[6]
  }

  const heights = [];
  if (flags & 0x01) {
    const count = (dim.x + 1) * (dim.y + 1);
    for (let i = 0; i < count; i++) {
      heights.push(readUint8());
    }
  }

  return {
    version,
    tag,
    tgt,
    strings: stringsRaw.split("\u0000"),
    edge_types,
    ground_types,
    offsets,
    dim,
    heights,
  };
}
