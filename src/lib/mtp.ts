export interface MTPHeader {
  version: number;
  unknown1: number;
  unknown2: number;
  recordCount: number;
}

export interface MTPRecord {
  filename: string | null;
  rotation: number;
  field2: number;
  field3: number;
  field8: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface MTPFile {
  header: MTPHeader;
  records: MTPRecord[];
}

const RECORD_SIZE = 20;
const HEADER_SIZE = 16;

export function parseMTP(buffer: ArrayBuffer): MTPFile {
  const view = new DataView(buffer);
  let offset = 0;

  const readUint32 = () => {
    if (offset + 4 > view.byteLength) throw new Error("Unexpected EOF while reading u32");
    const value = view.getUint32(offset, true);
    offset += 4;
    return value;
  };

  const readUint16 = () => {
    if (offset + 2 > view.byteLength) throw new Error("Unexpected EOF while reading u16");
    const value = view.getUint16(offset, true);
    offset += 2;
    return value;
  };

  const header: MTPHeader = {
    version: readUint32(),
    unknown1: readUint32(),
    unknown2: readUint32(),
    recordCount: readUint32(),
  };

  const recordsOffset = HEADER_SIZE;
  offset = recordsOffset + header.recordCount * RECORD_SIZE;
  const stringsLength = readUint32();
  const stringTableBytes = stringsLength * 2;
  if (stringsLength === 0 || offset + stringTableBytes > view.byteLength) {
    throw new Error("Invalid string table length");
  }

  const tableData = new Uint8Array(buffer, offset, stringTableBytes);
  const tableText = new TextDecoder("utf-16le").decode(tableData);

  const records: MTPRecord[] = [];
  for (let i = 0; i < header.recordCount; i++) {
    offset = recordsOffset + i * RECORD_SIZE;
    const nameOffset = readUint32();
    const rotation = readUint16();
    const field2 = readUint16();
    const field3 = readUint16();
    const top = readUint16();
    const left = readUint16();
    const right = readUint16();
    const bottom = readUint16();
    const field8 = readUint16();
    const filename = tableText.substring(nameOffset).split("\u0000")[0] || null;
    records.push({
      filename,
      rotation,
      field2,
      field3,
      field8,
      top,
      left,
      right,
      bottom,
    });
  }

  return {
    header,
    records,
  };
}
