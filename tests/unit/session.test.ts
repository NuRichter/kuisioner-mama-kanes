import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.SESSION_SECRET = "kunci-uji-unit-yang-cukup-panjang-0123456789";
  process.env.RESEARCHER_PASSWORD = "kata-sandi-uji";
});

describe("token unduhan", async () => {
  const { createDownloadToken, verifyDownloadToken, verifySessionToken } = await import("@/lib/auth/session");
  const now = Date.UTC(2026, 9, 8, 7, 0);

  it("berlaku untuk format yang sama selama 30 menit", () => {
    const t = createDownloadToken("pdf", now);
    expect(verifyDownloadToken(t, "pdf", now + 29 * 60_000)).toBe(true);
    expect(verifyDownloadToken(t, "pdf", now + 31 * 60_000)).toBe(false);
  });

  it("terikat pada format", () => {
    expect(verifyDownloadToken(createDownloadToken("pdf", now), "pptx", now)).toBe(false);
  });

  it("menolak token yang diubah", () => {
    const [payload, sig] = createDownloadToken("pptx", now).split(".");
    const forged = Buffer.from(`dl:pptx:${now + 999 * 60_000}`).toString("base64url");
    expect(verifyDownloadToken(`${forged}.${sig}`, "pptx", now)).toBe(false);
    expect(verifyDownloadToken(`${payload}.x${sig.slice(1)}`, "pptx", now)).toBe(false);
    expect(verifyDownloadToken(null, "pptx", now)).toBe(false);
  });

  it("tidak pernah lolos sebagai token sesi", () => {
    expect(verifySessionToken(createDownloadToken("csv", now), now)).toBe(false);
  });
});
