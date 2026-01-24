export interface TDTFile {
  version: number;
  tag: string | null;
  tdt: string | null;
  tgt: string | null;
  strings: string[];
}

export function parseTDT(buffer: ArrayBuffer): TDTFile {
  const view = new DataView(buffer);
  let offset = 0;

  const readUint32 = () => {
    if (offset + 4 > view.byteLength) throw new Error("Unexpected EOF while reading uint32");
    const value = view.getUint32(offset, true);
    offset += 4;
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

  const readString = (start: number) => {
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
  } else {
    const tgtOffset = readUint32();
    const tagOffset = readUint32();
    tgt = readString(tgtOffset);
    tag = readString(tagOffset);
  }

  return {
    version,
    tag,
    tdt: tdt ?? null,
    tgt,
    strings: stringsRaw.split("\u0000").filter(Boolean),
  };
}
