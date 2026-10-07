import { expect, type Page } from "@playwright/test";

export const isRemote = Boolean(process.env.BASE_URL);

/** Jawaban attention check yang benar menurut catatan peneliti. */
const ATTENTION: Record<string, string> = {
  "Tidak Setuju": "2",
  "Setuju": "4",
  "Sangat Tidak Setuju": "1",
};

export async function forward(page: Page) {
  await page.locator("main").getByRole("button", { name: /^(Mulai pengisian|Lanjut|Tinjau jawaban|Lanjutkan)/ }).click();
}

export async function stepHeading(page: Page) {
  return page.locator("#judul-langkah");
}

export async function choose(page: Page, groupName: RegExp | string, option: string | RegExp) {
  const group = page.getByRole("group", { name: groupName });
  await group.getByText(option, { exact: typeof option === "string" }).first().click();
}

export async function startQuestionnaire(page: Page) {
  await page.goto("/");
  await page.getByText("Setuju dan bersedia melanjutkan").click();
  await forward(page);
  await expect(page.locator("#judul-langkah")).toHaveText("Pertanyaan Penyaring");
}

export async function answerScreening(page: Page, overrides: Record<string, "Ya" | "Tidak"> = {}) {
  for (let i = 1; i <= 9; i++) {
    const id = `A${i}`;
    const answer = overrides[id] ?? (i === 9 ? "Tidak" : "Ya");
    const group = page.locator(`fieldset[data-field="${id}"]`);
    await group.getByText(answer, { exact: true }).click();
  }
}

export async function answerBasis(page: Page) {
  await page.locator('fieldset[data-field="A10"]').getByText("Aplikasi Bareksa").click();
  await page.locator('fieldset[data-field="A11"]').getByText("Ya", { exact: true }).click();
  await page.getByLabel("Tuliskan nama atau akun figur tersebut").fill("@figur.uji");
  await page.locator('fieldset[data-field="A12"]').getByText("Dalam 1 bulan terakhir").click();
  await page.locator('fieldset[data-field="A13"]').getByText("3 sampai 5 kali").click();
}

export async function answerProfile(page: Page) {
  await page.getByLabel(/Tahun lahir/).fill("2001");
  await page.getByLabel(/Provinsi domisili/).fill("Jawa Timur");
  await page.locator('fieldset[data-field="B3"]').getByText("Memilih tidak menjawab").click();
  await page.locator('fieldset[data-field="B4"]').getByText("Sarjana", { exact: true }).click();
  await page.locator('fieldset[data-field="B5"]').getByText("Bekerja", { exact: true }).click();
  await page.locator('fieldset[data-field="B6"]').getByText("Kurang dari 6 bulan").click();
}

/** Mengisi seluruh pernyataan pada halaman Likert; attention check dijawab benar. */
export async function answerLikertPage(page: Page, value = "4") {
  const statements = page.locator("fieldset[data-statement]");
  const count = await statements.count();
  for (let i = 0; i < count; i++) {
    const statement = statements.nth(i);
    const text = (await statement.locator("legend").innerText()).trim();
    const match = /mohon pilih “(.+?)”/.exec(text);
    const v = match ? ATTENTION[match[1]] : value;
    await statement.locator("label").nth(Number(v) - 1).click();
  }
  return count;
}

export async function currentSectionLetter(page: Page): Promise<string | null> {
  const label = page.locator("main header p", { hasText: /^Bagian [A-K]( ·|$)/ });
  if ((await label.count()) === 0) return null;
  return /Bagian ([A-K])/.exec(await label.innerText())![1];
}
