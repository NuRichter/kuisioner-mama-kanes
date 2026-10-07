import { randomUUID } from "node:crypto";
import { checkSubmission } from "@/lib/validation/submission";
import { saveResponse, StorageUnavailableError } from "@/lib/storage/responses";

const MAX_BODY_BYTES = 32_000;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Data jawaban terlalu besar." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Format data tidak dikenali." }, { status: 400 });
  }

  const now = new Date();
  const result = checkSubmission(body, now);
  if (!result.ok) {
    return Response.json({ error: result.reason, fields: result.fields }, { status: 422 });
  }

  const id = randomUUID();
  try {
    await saveResponse({ id, receivedAt: now.toISOString(), ...result.record });
  } catch (error) {
    const unavailable = error instanceof StorageUnavailableError;
    console.error("Gagal menyimpan jawaban", unavailable ? error.message : error);
    return Response.json(
      { error: "Jawaban belum dapat disimpan saat ini." },
      { status: unavailable ? 503 : 500 },
    );
  }

  return Response.json({ id }, { status: 201 });
}
