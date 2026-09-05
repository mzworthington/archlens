import type { YamlWorkspaceFile } from '../../application/analysis/persistBrowserLiteScan';

const CRC32_TABLE = makeCrc32Table();

export function createStoreZip(files: readonly YamlWorkspaceFile[]): Uint8Array {
  const encoded = files.map(file => {
    const nameBytes = new TextEncoder().encode(file.name.replace(/\\/g, '/'));
    const data = new TextEncoder().encode(file.content);
    return { nameBytes, data, crc: crc32(data) };
  });

  let localSize = 0;
  for (const file of encoded) {
    localSize += 30 + file.nameBytes.length + file.data.length;
  }
  let centralSize = 0;
  for (const file of encoded) {
    centralSize += 46 + file.nameBytes.length;
  }

  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let offset = 0;
  const localOffsets: number[] = [];

  for (const file of encoded) {
    localOffsets.push(offset);
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 8, 0, true);
    view.setUint32(offset + 14, file.crc, true);
    view.setUint32(offset + 18, file.data.length, true);
    view.setUint32(offset + 22, file.data.length, true);
    view.setUint16(offset + 26, file.nameBytes.length, true);
    out.set(file.nameBytes, offset + 30);
    out.set(file.data, offset + 30 + file.nameBytes.length);
    offset += 30 + file.nameBytes.length + file.data.length;
  }

  const centralStart = offset;
  for (let i = 0; i < encoded.length; i++) {
    const file = encoded[i]!;
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 20, true);
    view.setUint32(offset + 16, file.crc, true);
    view.setUint32(offset + 20, file.data.length, true);
    view.setUint32(offset + 24, file.data.length, true);
    view.setUint16(offset + 28, file.nameBytes.length, true);
    view.setUint32(offset + 42, localOffsets[i]!, true);
    out.set(file.nameBytes, offset + 46);
    offset += 46 + file.nameBytes.length;
  }

  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 8, encoded.length, true);
  view.setUint16(offset + 10, encoded.length, true);
  view.setUint32(offset + 12, offset - centralStart, true);
  view.setUint32(offset + 16, centralStart, true);

  return out;
}

export function triggerNamedDownload(fileName: string, data: Blob): void {
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
}
