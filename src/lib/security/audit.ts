import "server-only";
import { randomBytes } from "node:crypto";
import { put } from "@vercel/blob";
import { after } from "next/server";

export type AuditEvent =
  | "login.berhasil"
  | "login.gagal"
  | "login.dikunci"
  | "logout"
  | "unduh.laporan"
  | "unduh.ditolak"
  | "jawaban.ditolak";

/**
 * Jejak audit area peneliti. IP hanya disimpan sebagai hash berkunci.
 * Ditulis ke log server dan ke Blob privat (sistem/audit/) di produksi.
 */
export async function audit(event: AuditEvent, detail: Record<string, string | number | boolean> = {}) {
  const at = new Date().toISOString();
  const entry = { at, event, ...detail };
  console.info(`[audit] ${JSON.stringify(entry)}`);
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  const write = async () => {
    try {
      const pathname = `sistem/audit/${at.slice(0, 10)}/${at.replace(/[:.]/g, "-")}_${event}_${randomBytes(4).toString("hex")}.json`;
      await put(pathname, JSON.stringify(entry), { access: "private", contentType: "application/json", addRandomSuffix: false });
    } catch (error) {
      console.error("Gagal menulis audit", error);
    }
  };
  // Ditulis setelah respons terkirim (tidak menambah waktu tunggu), tetap dijamin selesai.
  try {
    after(write);
  } catch {
    await write();
  }
}
