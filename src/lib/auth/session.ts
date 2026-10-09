import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { openToken, safeEqual, sealToken, securityConfigured, sign } from "@/lib/security/crypto";

const isProd = process.env.NODE_ENV === "production";

/** Awalan __Host- memaksa cookie Secure, path=/, dan tanpa Domain (tidak bisa disetel subdomain lain). */
export const SESSION_COOKIE = isProd ? "__Host-kuesioner_peneliti" : "kuesioner_peneliti";
const SESSION_HOURS = 8;
const DOWNLOAD_MINUTES = 30;

// --- Kata sandi ---

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 32, maxmem: 64 * 1024 * 1024 };

/**
 * Format: scrypt:N:r:p:saltBase64:hashBase64 (dibuat dengan scripts/hash-password.mts).
 * Pemisah ":" dipilih karena "$" diekspansi sebagai variabel di berkas .env.
 */
export function hashPassword(password: string, salt = randomBytes(16)): string {
  const hash = scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join(":");
}

function parseHash(value: string | undefined) {
  const parts = value?.split(":");
  if (!parts || parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  const salt = Buffer.from(parts[4], "base64");
  const hash = Buffer.from(parts[5], "base64");
  if (![N, r, p].every(Number.isInteger) || salt.length < 16 || hash.length < 32) return null;
  return { N, r, p, salt, hash };
}

/**
 * Produksi memakai RESEARCHER_PASSWORD_HASH (scrypt). RESEARCHER_PASSWORD teks
 * biasa hanya diterima di luar produksi untuk kemudahan pengembangan lokal.
 */
function credential(): { kind: "hash"; value: NonNullable<ReturnType<typeof parseHash>> } | { kind: "plain"; value: string } | null {
  const parsed = parseHash(process.env.RESEARCHER_PASSWORD_HASH);
  if (parsed) return { kind: "hash", value: parsed };
  const plain = process.env.RESEARCHER_PASSWORD;
  if (plain && plain.length >= 12 && (!isProd || process.env.ALLOW_PLAINTEXT_PASSWORD === "1")) return { kind: "plain", value: plain };
  return null;
}

export function researcherAreaConfigured(): boolean {
  return credential() !== null && securityConfigured();
}

export function passwordMatches(input: unknown): boolean {
  const cred = credential();
  if (!cred || typeof input !== "string" || input.length === 0 || input.length > 256) return false;
  if (cred.kind === "hash") {
    const { N, r, p, salt, hash } = cred.value;
    const candidate = scryptSync(input, salt, hash.length, { N, r, p, maxmem: SCRYPT.maxmem });
    return timingSafeEqual(candidate, hash);
  }
  // Bandingkan dalam waktu konstan lewat HMAC agar panjang berbeda tidak bocor.
  return safeEqual(sign("password-version", input), sign("password-version", cred.value));
}

/** Sidik kredensial: berubah bila kata sandi diganti, sehingga sesi lama otomatis gugur. */
function passwordVersion(): string {
  const cred = credential();
  const material = cred?.kind === "hash" ? process.env.RESEARCHER_PASSWORD_HASH! : (cred?.value ?? "");
  return sign("password-version", material).slice(0, 16);
}

// --- Sesi ---

interface SessionPayload {
  sid: string;
  iat: number;
  exp: number;
  pv: string;
}

export function createSessionToken(now = Date.now()): string {
  const payload: SessionPayload = { sid: randomBytes(16).toString("base64url"), iat: now, exp: now + SESSION_HOURS * 3600_000, pv: passwordVersion() };
  return sealToken("session", payload);
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!researcherAreaConfigured()) return false;
  const s = openToken<SessionPayload>("session", token);
  return Boolean(s && typeof s.exp === "number" && s.exp > now && s.iat <= now + 60_000 && s.pv === passwordVersion());
}

export async function hasSession(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_HOURS * 3600,
  priority: "high" as const,
};

// --- Token unduhan ---

interface DownloadPayload {
  f: string;
  exp: number;
  pv: string;
}

/**
 * Token unduhan bertanda tangan, terikat pada satu format dan berlaku singkat.
 * Download manager (mis. IDM) mengulang permintaan tanpa cookie browser,
 * sehingga tautan unduhan perlu membawa izinnya sendiri. Kunci HKDF terpisah
 * membuat token ini tidak pernah lolos sebagai token sesi.
 */
export function createDownloadToken(format: string, now = Date.now()): string {
  return sealToken("download", { f: format, exp: now + DOWNLOAD_MINUTES * 60_000, pv: passwordVersion() } satisfies DownloadPayload);
}

export function verifyDownloadToken(token: string | null, format: string, now = Date.now()): boolean {
  const d = openToken<DownloadPayload>("download", token);
  return Boolean(d && d.f === format && typeof d.exp === "number" && d.exp > now && d.pv === passwordVersion());
}
