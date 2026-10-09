import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Satu rahasia induk (SESSION_SECRET) diturunkan menjadi kunci terpisah per
 * keperluan dengan HKDF, sehingga token sesi, token unduhan, token formulir,
 * dan hash IP tidak pernah saling dapat dipertukarkan.
 */

const DEV_SECRET = "hanya-untuk-pengembangan-lokal-jangan-dipakai-di-produksi";

export class SecurityConfigError extends Error {}

function masterSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== "production") return DEV_SECRET;
  return null;
}

export function securityConfigured(): boolean {
  return masterSecret() !== null;
}

export type KeyPurpose = "session" | "download" | "form" | "ip" | "password-version";

const keyCache = new Map<string, Buffer>();

export function subkey(purpose: KeyPurpose): Buffer {
  const master = masterSecret();
  if (!master) throw new SecurityConfigError("SESSION_SECRET belum dikonfigurasi.");
  const cacheKey = `${purpose}:${createHash("sha256").update(master).digest("hex")}`;
  let key = keyCache.get(cacheKey);
  if (!key) {
    key = Buffer.from(hkdfSync("sha256", master, "kuesioner-penelitian", `v1:${purpose}`, 32));
    keyCache.set(cacheKey, key);
  }
  return key;
}

export function sign(purpose: KeyPurpose, payload: string): string {
  return createHmac("sha256", subkey(purpose)).update(payload).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Token bertanda tangan: base64url(JSON).signature */
export function sealToken(purpose: KeyPurpose, data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(purpose, payload)}`;
}

export function openToken<T>(purpose: KeyPurpose, token: string | null | undefined): T | null {
  if (!token || token.length > 1024) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  try {
    if (!safeEqual(sign(purpose, payload), signature)) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

/** Hash IP berkunci: dipakai untuk pembatasan laju dan audit tanpa menyimpan IP asli. */
export function hashIp(ip: string): string {
  return sign("ip", ip).slice(0, 32);
}

// --- Enkripsi data jawaban saat disimpan (AES-256-GCM) ---

export interface EncryptedEnvelope {
  enc: "aes-256-gcm";
  kid: string;
  iv: string;
  tag: string;
  data: string;
}

const AAD = Buffer.from("kuesioner-penelitian:jawaban:v1");

function parseKey(value: string | undefined): Buffer | null {
  if (!value) return null;
  const key = Buffer.from(value, "base64");
  return key.length === 32 ? key : null;
}

function keyId(key: Buffer) {
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}

/** Kunci aktif untuk enkripsi dan kunci lama (opsional) untuk rotasi. */
function dataKeys(): { active: Buffer | null; all: Map<string, Buffer> } {
  const active = parseKey(process.env.DATA_ENCRYPTION_KEY);
  const previous = parseKey(process.env.DATA_ENCRYPTION_KEY_PREVIOUS);
  const all = new Map<string, Buffer>();
  for (const k of [active, previous]) if (k) all.set(keyId(k), k);
  return { active, all };
}

export function encryptionConfigured(): boolean {
  return dataKeys().active !== null;
}

export function encrypt(plaintext: string): EncryptedEnvelope {
  const { active } = dataKeys();
  if (!active) throw new SecurityConfigError("DATA_ENCRYPTION_KEY belum dikonfigurasi.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", active, iv);
  cipher.setAAD(AAD);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { enc: "aes-256-gcm", kid: keyId(active), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

export function isEnvelope(value: unknown): value is EncryptedEnvelope {
  return typeof value === "object" && value !== null && (value as EncryptedEnvelope).enc === "aes-256-gcm";
}

export function decrypt(envelope: EncryptedEnvelope): string {
  const key = dataKeys().all.get(envelope.kid);
  if (!key) throw new SecurityConfigError(`Kunci enkripsi ${envelope.kid} tidak tersedia.`);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(envelope.data, "base64")), decipher.final()]).toString("utf8");
}
