import { expect, request as apiRequest, test } from "@playwright/test";
import { isRemote } from "./helpers";

const password = isRemote ? process.env.E2E_RESEARCHER_PASSWORD : "uji-lokal-kata-sandi";

test.describe("dasbor peneliti", () => {
  test.skip(!password, "Kata sandi peneliti produksi tidak diberikan (E2E_RESEARCHER_PASSWORD).");

  test("login, dasbor, dan seluruh unduhan", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/peneliti");
    await expect(page.getByRole("heading", { name: "Masuk ke dasbor peneliti" })).toBeVisible();

    await page.getByLabel("Kata sandi peneliti").fill("bukan-kata-sandi");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByText("Kata sandi tidak cocok", { exact: false })).toBeVisible();

    await page.getByLabel("Kata sandi peneliti").fill(password!);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByRole("heading", { name: "Dasbor peneliti", exact: true })).toBeVisible({ timeout: 30_000 });

    for (const chapter of ["Pengumpulan", "Screening data", "Profil responden", "Konstruk dan butir", "Manusia vs mesin", "Kepercayaan dan risiko", "Hubungan antarkonstruk", "Efek urutan C dan D", "Data jawaban"]) {
      await expect(page.getByRole("heading", { level: 2, name: chapter })).toBeAttached();
    }
    await expect(page.getByText("Insight dari data")).toBeVisible();

    const expected: Record<string, RegExp> = {
      "CSV mentah": /text\/csv/,
      "CSV bersih": /text\/csv/,
      Excel: /spreadsheetml/,
      PDF: /application\/pdf/,
      PowerPoint: /presentationml/,
    };
    // Tanpa cookie, seperti download manager (IDM) yang mengulang permintaan sendiri.
    const cookieless = await apiRequest.newContext({ baseURL: test.info().project.use.baseURL });
    for (const [label, type] of Object.entries(expected)) {
      const href = await page.getByRole("link", { name: label }).getAttribute("href");
      const res = await cookieless.get(href!);
      expect(res.status(), label).toBe(200);
      expect(res.headers()["content-type"], label).toMatch(type);
      expect((await res.body()).length, label).toBeGreaterThan(200);
    }
    await cookieless.dispose();

    // Filter lewat URL tercermin pada ringkasan.
    await page.goto("/peneliti?versi=DC&sampel=semua&longstring=12");
    await expect(page.getByText("semua jawaban, versi DC, ambang longstring 12", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page.getByRole("heading", { name: "Masuk ke dasbor peneliti" })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
