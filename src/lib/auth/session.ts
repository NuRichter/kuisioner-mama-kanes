import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "kuesioner_peneliti";
const SESSION_HOURS = 8;

function secret(): string | null {
  const explicit = process.env.SESSION_SECRET;
  if (explicit && explicit.length >= 32) return explicit;
  // Tanpa SESSION_SECRET (lokal), turunkan dari kata sandi agar sesi tetap bertanda tangan.
  const password = process.env.RESEARCHER_PASSWORD;
  if (password && process.env.NODE_ENV !== "production") return createHash("sha256").update(`sesi:${password}`).digest("hex");
  return null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

/** Area peneliti hanya aktif bila kata sandi kuat sudah dikonfigurasi. */
export function researcherAreaConfigured(): boolean {
  const password = process.env.RESEARCHER_PASSWORD;
  return Boolean(password && password.length >= 12 && secret());
}

export function passwordMatches(input: unknown): boolean {
  const expected = process.env.RESEARCHER_PASSWORD;
  if (!researcherAreaConfigured() || !expected || typeof input !== "string") return false;
  return timingSafeEqual(digest(input), digest(expected));
}

export function createSessionToken(now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("SESSION_SECRET belum dikonfigurasi.");
  const payload = String(now + SESSION_HOURS * 3600_000);
  return `${payload}.${sign(payload, key)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  const key = secret();
  if (!token || !key) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload, key);
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return false;
  return Number(payload) > now;
}

export async function hasSession(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_HOURS * 3600,
};
