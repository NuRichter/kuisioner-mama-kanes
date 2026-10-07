import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  answerBasis,
  answerLikertPage,
  answerProfile,
  answerScreening,
  currentSectionLetter,
  forward,
  isRemote,
  startQuestionnaire,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  // Di produksi, pengiriman dicegat agar data uji tidak tercampur data penelitian.
  if (isRemote) {
    await page.route("**/api/responses", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 201, contentType: "application/json", body: '{"id":"uji"}' })
        : route.continue(),
    );
  }
});

test("halaman awal menampilkan informasi, persetujuan, dan footer", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Kredibilitas Sumber Manusia dan Sistem Cerdas dalam Ekosistem Investasi Digital",
  );
  await expect(page.getByText("Pengisian kuesioner ini memerlukan waktu sekitar 11 sampai 13 menit.")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toHaveText(
    "Questionnaire dibuat Irma Dwi Kusuma © 2026 All Rights Reserved",
  );

  const body = await page.locator("body").innerText();
  for (const hidden of ["FC_EXP1", "D+A", "Dipakai", "CATATAN UNTUK PENELITI"]) {
    expect(body).not.toContain(hidden);
  }
  expect(errors).toEqual([]);
});

test("persetujuan wajib dipilih dan menolak menghentikan pengisian", async ({ page }) => {
  await page.goto("/");
  await forward(page);
  await expect(page.getByText("Pilih salah satu pilihan persetujuan untuk melanjutkan.")).toBeVisible();

  await page.getByText("Tidak setuju (pengisian dihentikan)").click();
  await page.locator("main").getByRole("button", { name: "Lanjutkan" }).click();
  await expect(page.locator("#judul-langkah")).toHaveText("Pengisian dihentikan");
  await expect(page.getByText(/Anda memilih tidak setuju/)).toBeVisible();

  await page.getByRole("button", { name: "Perbaiki jawaban" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("A9 = Ya menghentikan pengisian karena tidak memenuhi kriteria", async ({ page }) => {
  await startQuestionnaire(page);
  await forward(page);
  await expect(page.locator("main").getByText("Silakan pilih salah satu jawaban sebelum melanjutkan.")).toHaveCount(9);
  await expect(page.getByText("Ada 9 jawaban yang perlu dilengkapi.", { exact: false })).toBeVisible();

  await answerScreening(page, { A9: "Ya" });
  await forward(page);
  await expect(page.locator("#judul-langkah")).toHaveText("Pengisian dihentikan");
  await expect(page.getByText(/kriteria kelayakan penelitian ini belum terpenuhi/)).toBeVisible();
});

test("A11 = Tidak menghentikan pengisian", async ({ page }) => {
  await startQuestionnaire(page);
  await answerScreening(page);
  await forward(page);
  await expect(page.locator("#judul-langkah")).toHaveText("Konfirmasi Basis Penilaian");
  await page.locator('fieldset[data-field="A10"]').getByText("Aplikasi Bareksa").click();
  await page.locator('fieldset[data-field="A11"]').getByText("Tidak (pengisian dihentikan)").click();
  await page.locator('fieldset[data-field="A12"]').getByText("Tidak ingat pasti").click();
  await page.locator('fieldset[data-field="A13"]').getByText("1 sampai 2 kali").click();
  await forward(page);
  await expect(page.getByText(/memerlukan satu figur finfluencer/)).toBeVisible();
});

test("isian Lainnya dan tahun lahir divalidasi", async ({ page }) => {
  await startQuestionnaire(page);
  await answerScreening(page);
  await forward(page);

  await page.locator('fieldset[data-field="A10"]').getByText("Kanal resmi Bareksa lainnya").click();
  await expect(page.getByLabel("Sebutkan kanal resmi Bareksa lainnya")).toBeFocused();
  await answerBasis(page);
  await forward(page);
  await expect(page.getByText("Sebutkan kanal resmi Bareksa lainnya agar jawaban Anda lengkap.")).toBeVisible();
  await page.getByLabel("Sebutkan kanal resmi Bareksa lainnya").fill("Kanal Telegram resmi");
  await forward(page);

  await expect(page.locator("#judul-langkah")).toHaveText("Karakteristik Responden");
  await answerProfile(page);
  await page.getByLabel(/Tahun lahir/).fill("1990");
  await forward(page);
  await expect(page.getByText(/rentang 1997 sampai 2012/)).toBeVisible();
  await expect(page.getByLabel(/Tahun lahir/)).toBeFocused();
  await page.getByLabel(/Tahun lahir/).fill("20a0x");
  await expect(page.getByLabel(/Tahun lahir/)).toHaveValue("200");
});

test("alur lengkap: kembali, muat ulang, tinjau, dan kirim", async ({ page }) => {
  await startQuestionnaire(page);
  await answerScreening(page);
  await forward(page);
  await answerBasis(page);
  await forward(page);
  await answerProfile(page);
  await forward(page);

  // Halaman Likert pertama (C atau D sesuai versi) memuat petunjuk skala.
  const first = await currentSectionLetter(page);
  expect(["C", "D"]).toContain(first);
  await expect(page.getByRole("heading", { name: "Petunjuk Pengisian Bagian C sampai Bagian K" })).toBeVisible();

  // Validasi Likert.
  await forward(page);
  await expect(page.getByText(/pernyataan yang belum dijawab/)).toBeVisible();
  const total = await answerLikertPage(page, "5");
  await expect(page.locator("header").getByText(`${total}/53`)).toBeVisible();
  await forward(page);

  // Kembali mempertahankan jawaban.
  const second = await currentSectionLetter(page);
  expect(second).toBe(first === "C" ? "D" : "C");
  await page.locator("main").getByRole("button", { name: "Kembali" }).click();
  expect(await currentSectionLetter(page)).toBe(first);
  await expect(page.locator("fieldset[data-statement] input:checked")).toHaveCount(total);
  await forward(page);

  // Muat ulang memulihkan langkah dan jawaban.
  await answerLikertPage(page, "3");
  await page.reload();
  expect(await currentSectionLetter(page)).toBe(second);
  await expect(page.getByText(/sudah dipulihkan dari perangkat ini/)).toBeVisible();
  await expect(page.locator("fieldset[data-statement] input:checked")).toHaveCount(
    await page.locator("fieldset[data-statement]").count(),
  );

  let letter = await currentSectionLetter(page);
  while (letter) {
    await answerLikertPage(page, "4");
    await forward(page);
    letter = await currentSectionLetter(page);
  }

  await expect(page.locator("#judul-langkah")).toHaveText("Tinjau sebelum mengirim");
  const rows = page.locator("main ol li");
  await expect(rows).toHaveCount(12);
  for (const text of await rows.allInnerTexts()) {
    const [, answered, total] = /(\d+) dari (\d+) terjawab/.exec(text)!;
    expect(answered).toBe(total);
  }

  const submitted = page.waitForResponse((r) => r.url().endsWith("/api/responses") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Kirim jawaban" }).click();
  const response = await submitted;
  expect(response.status()).toBe(201);
  const payload = response.request().postDataJSON() as { answers: Record<string, unknown>; formVersion: string };
  expect(Object.keys(payload.answers).filter((k) => /^(FC|RAC|TIP|INT|PR|AC|PSR|DIS|TRA|AIL)/.test(k))).toHaveLength(53);
  expect(payload.answers.AC1).toBe("2");
  expect(payload.answers.AC2).toBe("4");
  expect(payload.answers.AC3).toBe("1");

  await expect(page.locator("#judul-langkah")).toHaveText("Jawaban Anda sudah terkirim");
  await expect(page.getByText("Terima kasih atas waktu dan partisipasi Anda.", { exact: false })).toBeVisible();

  // Setelah terkirim, jawaban tidak lagi tersimpan di perangkat.
  const stored = await page.evaluate(() => localStorage.getItem("kuesioner-penelitian:v1"));
  expect(stored).not.toContain("@figur.uji");
  await page.reload();
  await expect(page.locator("#judul-langkah")).toHaveText("Jawaban Anda sudah terkirim");
});

test("mulai ulang meminta konfirmasi lalu menghapus jawaban", async ({ page }) => {
  await startQuestionnaire(page);
  await answerScreening(page);
  await page.getByRole("button", { name: "Mulai ulang" }).click();
  const dialog = page.getByRole("dialog", { name: "Mulai ulang dari awal?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Batal" }).click();
  await expect(page.locator('fieldset[data-field="A1"] input:checked')).toHaveCount(1);

  await page.getByRole("button", { name: "Mulai ulang" }).click();
  await dialog.getByRole("button", { name: "Hapus jawaban" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("input:checked")).toHaveCount(0);
});

test("tombol kembali peramban berpindah antarbagian", async ({ page }) => {
  await startQuestionnaire(page);
  await answerScreening(page);
  await forward(page);
  await expect(page).toHaveURL(/#BASIS$/);
  await page.goBack();
  await expect(page.locator("#judul-langkah")).toHaveText("Pertanyaan Penyaring");
  await expect(page.locator('fieldset[data-field="A9"] input:checked')).toHaveCount(1);
});

test("aksesibilitas otomatis (axe) tanpa pelanggaran serius", async ({ page }) => {
  await page.goto("/");
  const intro = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(intro.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

  await startQuestionnaire(page);
  await forward(page); // memunculkan galat
  const screening = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(screening.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test("tidak ada gulir horizontal pada lebar 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await startQuestionnaire(page);
  await answerScreening(page);
  await forward(page);
  await answerBasis(page);
  await forward(page);
  await answerProfile(page);
  await forward(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("API menolak data tidak lengkap dan kata sandi ekspor yang salah", async ({ request }) => {
  const res = await request.post("/api/responses", { data: { formVersion: "CD", startedAt: new Date().toISOString(), answers: {} } });
  expect(res.status()).toBe(422);
  const exp = await request.post("/api/export", { data: { password: "salah" } });
  expect(exp.status()).toBe(401);
});
