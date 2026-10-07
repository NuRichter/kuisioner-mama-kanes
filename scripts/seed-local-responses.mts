/**
 * Data SINTETIS untuk pengembangan lokal dasbor peneliti.
 * Menulis ke .data/responses/ (git-ignored), tidak pernah ke Vercel Blob.
 *
 * Pemakaian: node scripts/seed-local-responses.ts [jumlah]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { likertOrderBase, likertSections, PROVINCES } from "../src/data/questionnaire.ts";

if (process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN terdeteksi. Skrip ini hanya untuk data lokal.");
  process.exit(1);
}

const count = Number(process.argv[2] ?? 240);
const dir = path.join(process.cwd(), ".data", "responses");
mkdirSync(dir, { recursive: true });

// Generator acak deterministik agar hasil dapat diulang.
let seed = 20261008;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const normal = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
const pick = <T,>(xs: readonly T[], weights?: number[]) => {
  if (!weights) return xs[Math.floor(rand() * xs.length)];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < xs.length; i++) if ((r -= weights[i]) <= 0) return xs[i];
  return xs[xs.length - 1];
};
const likert = (latent: number, bias = 0) => String(Math.min(5, Math.max(1, Math.round(3.3 + bias + 0.85 * latent + 0.6 * normal()))));

const order = (version: "CD" | "DC") => {
  const ids = [...likertOrderBase] as string[];
  if (version === "DC") [ids[0], ids[1]] = [ids[1], ids[0]];
  return ids.flatMap((id) => likertSections[id as keyof typeof likertSections].items.map((i) => i.code));
};

const start = Date.now() - 1000 * 60 * 60 * 24 * 21;

for (let k = 0; k < count; k++) {
  const version = rand() < 0.5 ? "CD" : "DC";
  const fc = normal();
  const rac = 0.35 * fc + normal() * 0.9 + 0.25;
  const tip = 0.55 * rac + 0.25 * fc + normal() * 0.7;
  const pr = -0.3 * tip + normal() * 0.9;
  const int = 0.5 * tip + 0.2 * rac - 0.25 * pr + normal() * 0.7;
  const psr = 0.6 * fc + normal() * 0.8;
  const dis = 0.4 * fc + normal() * 0.9;
  const tra = 0.65 * rac + 0.2 * tip + normal() * 0.7;
  const ail = normal();
  const latent: Record<string, number> = { FC: fc, RAC: rac, TIP: tip, PR: pr, INT: int, PSR: psr, DIS: dis, TRA: tra, AIL: ail };
  const prefix = (code: string) =>
    code.startsWith("FC_GLOB") ? "FC" : code.startsWith("RAC_GLOB") ? "RAC" : code.startsWith("FC") ? "FC" : code.startsWith("RAC") ? "RAC" : code.startsWith("TIP") ? "TIP" : code.startsWith("PR") ? "PR" : code.startsWith("INT") ? "INT" : code.startsWith("PSR") ? "PSR" : code.startsWith("DIS") ? "DIS" : code.startsWith("TRA") ? "TRA" : "AIL";

  const careless = rand() < 0.06;
  const straight = String(1 + Math.floor(rand() * 5));
  const answers: Record<string, string | string[]> = {};
  for (const code of order(version)) {
    if (careless) answers[code] = straight;
    else if (code === "AC1") answers[code] = rand() < 0.95 ? "2" : "3";
    else if (code === "AC2") answers[code] = rand() < 0.93 ? "4" : "5";
    else if (code === "AC3") answers[code] = rand() < 0.96 ? "1" : "2";
    else answers[code] = likert(latent[prefix(code)], code.startsWith("PR") ? -0.1 : 0);
  }

  const channels = ["1", "2", "3", "4"].filter(() => rand() < 0.45);
  if (channels.length === 0) channels.push("1");
  Object.assign(answers, {
    CONSENT: "1",
    A1: "1", A2: "1", A3: "1", A4: "1", A5: "1", A6: "1", A7: "1", A8: "1", A9: "0",
    A10: channels.sort(),
    A11: "1",
    A11_figure: pick(["@figur.edukasi", "@cerdas.reksadana", "@investor.muda", "@belajar.cuan"]),
    A12: pick(["1", "2", "3", "4", "5", "6"], [40, 25, 14, 8, 5, 8]),
    A13: pick(["1", "2", "3", "4", "5"], [10, 30, 30, 18, 12]),
    B1: String(pick([1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008], [3, 4, 6, 8, 10, 11, 12, 12, 10, 9, 6, 3])),
    B2: pick(PROVINCES, PROVINCES.map((p) => (["Jawa Timur", "Jawa Barat", "DKI Jakarta", "Jawa Tengah", "Banten"].includes(p) ? 12 : 1))),
    B3: pick(["1", "2", "3"], [52, 45, 3]),
    B4: pick(["1", "2", "3", "4"], [38, 12, 44, 6]),
    B5: pick(["1", "2", "3", "4"], [45, 35, 12, 8]),
    B6: pick(["1", "2", "3", "4", "5"], [35, 25, 18, 15, 7]),
  });

  const startedAt = new Date(start + (k / count) * 1000 * 60 * 60 * 24 * 20 + rand() * 3600_000);
  const durationSeconds = Math.round(careless ? 120 + rand() * 180 : 420 + Math.abs(normal()) * 300 + rand() * 300);
  const receivedAt = new Date(startedAt.getTime() + durationSeconds * 1000);
  const id = `contoh-${randomUUID()}`;
  const record = { id, receivedAt: receivedAt.toISOString(), startedAt: startedAt.toISOString(), durationSeconds, formVersion: version, answers };
  writeFileSync(path.join(dir, `${record.receivedAt.replace(/[:.]/g, "-")}_${id}.json`), JSON.stringify(record));
}

console.log(`${count} jawaban sintetis ditulis ke ${dir}`);
