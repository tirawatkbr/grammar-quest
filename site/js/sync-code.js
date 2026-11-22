// Sync code: progress state -> compact text code and back.
// Format:  GQ1.<crc32 hex>.<base64url(deflate-raw(JSON))>   (GQ0 = uncompressed fallback)
// Works in browsers and Node 18+ (CompressionStream is global in both).

const enc = new TextEncoder();
const dec = new TextDecoder();

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

function toB64url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

const hasCompression = typeof CompressionStream === "function" && typeof DecompressionStream === "function";

/** Strip settings (device preference) and encode. */
export async function encodeState(state) {
  const { settings, ...rest } = state;
  const json = enc.encode(JSON.stringify(rest));
  const crc = crc32(json);
  if (hasCompression) {
    const z = await pipe(json, new CompressionStream("deflate-raw"));
    return `GQ1.${crc}.${toB64url(z)}`;
  }
  return `GQ0.${crc}.${toB64url(json)}`;
}

export class SyncCodeError extends Error {}

/** Decode a code. Throws SyncCodeError with a Thai message on any problem. */
export async function decodeState(code) {
  const clean = String(code || "").replace(/\s+/g, "");
  const m = /^GQ([01])\.([0-9a-f]{8})\.([A-Za-z0-9_-]+)$/.exec(clean);
  if (!m) throw new SyncCodeError("รหัสไม่ถูกรูปแบบ — ต้องขึ้นต้นด้วย GQ1. และคัดลอกมาให้ครบทั้งหมด");
  let bytes;
  try {
    bytes = fromB64url(m[3]);
    if (m[1] === "1") {
      if (!hasCompression) throw new SyncCodeError("เบราว์เซอร์นี้ไม่รองรับการอ่านรหัส — ลองอัปเดตเบราว์เซอร์");
      bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
    }
  } catch (e) {
    if (e instanceof SyncCodeError) throw e;
    throw new SyncCodeError("อ่านรหัสไม่ได้ — รหัสอาจถูกตัดหรือคัดลอกไม่ครบ");
  }
  if (crc32(bytes) !== m[2]) throw new SyncCodeError("รหัสไม่สมบูรณ์ (ตรวจสอบความถูกต้องไม่ผ่าน) — คัดลอกใหม่อีกครั้ง");
  try {
    const obj = JSON.parse(dec.decode(bytes));
    if (!obj || typeof obj !== "object" || typeof obj.xp !== "number") throw new Error("shape");
    return obj;
  } catch {
    throw new SyncCodeError("ข้อมูลในรหัสไม่ถูกต้อง");
  }
}
