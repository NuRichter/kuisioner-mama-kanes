import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.SESSION_SECRET = "kunci-uji-unit-yang-cukup-panjang-0123456789";
  process.env.RESEARCHER_PASSWORD = "kata-sandi-uji-panjang";
  process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("kata sandi dan sesi", async () => {
  const session = await import("@/lib/auth/session");
  const now = Date.UTC(2026, 9, 9, 7, 0);

  it("hash scrypt memverifikasi kata sandi yang benar saja", () => {
    process.env.RESEARCHER_PASSWORD_HASH = session.hashPassword("MamaKanes1234");
    expect(session.passwordMatches("MamaKanes1234")).toBe(true);
    expect(session.passwordMatches("mamakanes1234")).toBe(false);
    expect(session.passwordMatches("")).toBe(false);
    expect(session.passwordMatches("x".repeat(300))).toBe(false);
    delete process.env.RESEARCHER_PASSWORD_HASH;
  });

  it("token sesi kedaluwarsa setelah 8 jam", () => {
    const t = session.createSessionToken(now);
    expect(session.verifySessionToken(t, now + 7 * 3600_000)).toBe(true);
    expect(session.verifySessionToken(t, now + 9 * 3600_000)).toBe(false);
  });

  it("mengganti kata sandi menggugurkan sesi lama", () => {
    const t = session.createSessionToken(now);
    process.env.RESEARCHER_PASSWORD = "kata-sandi-baru-yang-lain";
    expect(session.verifySessionToken(t, now + 1000)).toBe(false);
    process.env.RESEARCHER_PASSWORD = "kata-sandi-uji-panjang";
    expect(session.verifySessionToken(t, now + 1000)).toBe(true);
  });

  it("token unduhan terikat format, berlaku 30 menit, dan tidak bisa dipakai sebagai sesi", () => {
    const t = session.createDownloadToken("pdf", now);
    expect(session.verifyDownloadToken(t, "pdf", now + 29 * 60_000)).toBe(true);
    expect(session.verifyDownloadToken(t, "pdf", now + 31 * 60_000)).toBe(false);
    expect(session.verifyDownloadToken(t, "pptx", now)).toBe(false);
    expect(session.verifySessionToken(t, now)).toBe(false);
  });

  it("menolak token yang diubah", () => {
    const [payload, sig] = session.createDownloadToken("pptx", now).split(".");
    const forged = Buffer.from(JSON.stringify({ f: "pptx", exp: now + 999 * 60_000 })).toString("base64url");
    expect(session.verifyDownloadToken(`${forged}.${sig}`, "pptx", now)).toBe(false);
    expect(session.verifyDownloadToken(`${payload}.x${sig.slice(1)}`, "pptx", now)).toBe(false);
    expect(session.verifyDownloadToken(null, "pptx", now)).toBe(false);
  });
});

describe("enkripsi jawaban", async () => {
  const crypto = await import("@/lib/security/crypto");

  it("enkripsi lalu dekripsi menghasilkan teks semula", () => {
    const env = crypto.encrypt('{"A11_figure":"@figur"}');
    expect(env.data).not.toContain("figur");
    expect(crypto.decrypt(env)).toBe('{"A11_figure":"@figur"}');
  });

  it("setiap enkripsi memakai IV berbeda", () => {
    expect(crypto.encrypt("sama").iv).not.toBe(crypto.encrypt("sama").iv);
  });

  it("menolak data yang diubah (autentikasi GCM)", () => {
    const env = crypto.encrypt("rahasia");
    const bytes = Buffer.from(env.data, "base64");
    bytes[0] ^= 1;
    expect(() => crypto.decrypt({ ...env, data: bytes.toString("base64") })).toThrow();
  });

  it("rotasi kunci: data lama tetap terbaca dengan kunci sebelumnya", () => {
    const old = crypto.encrypt("data lama");
    process.env.DATA_ENCRYPTION_KEY_PREVIOUS = process.env.DATA_ENCRYPTION_KEY;
    process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(crypto.decrypt(old)).toBe("data lama");
    delete process.env.DATA_ENCRYPTION_KEY_PREVIOUS;
    expect(() => crypto.decrypt(old)).toThrow();
  });

  it("token antar-keperluan tidak dapat dipertukarkan", () => {
    const t = crypto.sealToken("form", { id: "x" });
    expect(crypto.openToken("form", t)).toEqual({ id: "x" });
    expect(crypto.openToken("session", t)).toBeNull();
    expect(crypto.openToken("form", `${t}.ekstra`)).toBeNull();
  });
});

describe("token formulir", async () => {
  const { issueFormToken, checkFormToken } = await import("@/lib/security/form-token");
  const now = Date.UTC(2026, 9, 9, 7, 0);

  it("menolak pengiriman kurang dari 60 detik setelah persetujuan", () => {
    const t = issueFormToken(now);
    expect(checkFormToken(t, now + 30_000)).toEqual({ ok: false, reason: "terlalu-cepat" });
    const ok = checkFormToken(t, now + 8 * 60_000);
    expect(ok.ok && ok.startedAt.getTime()).toBe(now);
  });

  it("menolak token kedaluwarsa dan palsu", () => {
    expect(checkFormToken(issueFormToken(now), now + 15 * 86_400_000)).toEqual({ ok: false, reason: "kedaluwarsa" });
    expect(checkFormToken("palsu.palsu", now)).toEqual({ ok: false, reason: "tidak-sah" });
    expect(checkFormToken(undefined, now)).toEqual({ ok: false, reason: "tidak-sah" });
  });
});

describe("pembatas laju (memori lokal)", async () => {
  const { hitLimit, peekLimit, resetLimit } = await import("@/lib/security/rate-limit");
  const now = Date.UTC(2026, 9, 9, 7, 0);

  it("mengunci setelah batas lalu terbuka lagi setelah jendela berakhir", async () => {
    const key = `uji/${Math.random()}`;
    for (let i = 0; i < 5; i++) await hitLimit(key, 5, 900, now);
    expect((await peekLimit(key, 5, now + 1000)).limited).toBe(true);
    expect((await peekLimit(key, 5, now + 901_000)).limited).toBe(false);
  });

  it("reset menghapus penghitung", async () => {
    const key = `uji/${Math.random()}`;
    await hitLimit(key, 1, 900, now);
    await resetLimit(key);
    expect((await peekLimit(key, 1, now)).count).toBe(0);
  });
});
