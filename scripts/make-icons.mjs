// 依存ゼロでプレースホルダのアイコン PNG を生成する（本番用の絵は後で差し替え）
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const cx = size / 2, cy = size * 0.52, r = size * 0.3;
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      // 青地に白い雫っぽい丸
      const inDrop = d < r || (Math.abs(x - cx) < r * (1 - (cy - y) / (r * 1.6)) && y < cy && y > cy - r * 1.9);
      const [R, G, B] = inDrop ? [255, 255, 255] : [27, 108, 168];
      raw[p++] = R; raw[p++] = G; raw[p++] = B;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8bit truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = new URL("../docs/icons/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const size of [192, 512]) {
  const buf = png(size);
  writeFileSync(new URL(`icon-${size}.png`, dir), buf);
  console.log(`icon-${size}.png`, buf.length, "bytes", createHash("sha1").update(buf).digest("hex").slice(0, 8));
}
