"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  passwordMatches,
  researcherAreaConfigured,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { audit } from "@/lib/security/audit";
import { hashIp } from "@/lib/security/crypto";
import { hitLimit, peekLimit, resetLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";

export interface LoginState {
  error: string | null;
  /** Bertambah pada setiap percobaan gagal; memicu ulang animasi getar di formulir. */
  attempt: number;
}

/** Batas percobaan gagal: per IP dan global (melawan tebakan dari banyak IP). */
const PER_IP = { limit: 5, windowSeconds: 15 * 60 };
const GLOBAL = { limit: 30, windowSeconds: 15 * 60 };

function lockedMessage(seconds: number) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Terlalu banyak percobaan masuk. Demi keamanan, coba lagi dalam ${minutes} menit.`;
}

export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  const attempt = prev.attempt + 1;
  if (!researcherAreaConfigured()) {
    return { error: "Area peneliti belum dikonfigurasi di server. Atur RESEARCHER_PASSWORD_HASH dan SESSION_SECRET.", attempt };
  }

  const ipHash = hashIp(clientIp(await headers()));
  const ipKey = `login-ip/${ipHash}`;
  const globalKey = "login-global/semua";
  const [ip, all] = await Promise.all([peekLimit(ipKey, PER_IP.limit), peekLimit(globalKey, GLOBAL.limit)]);
  if (ip.limited || all.limited) {
    // Saat terkunci, kata sandi tidak diperiksa sama sekali.
    await audit("login.dikunci", { ip: ipHash, global: all.limited });
    return { error: lockedMessage(Math.max(ip.retryAfterSeconds, all.retryAfterSeconds)), attempt };
  }

  if (!passwordMatches(formData.get("password"))) {
    const [ipHit, globalHit] = await Promise.all([
      hitLimit(ipKey, PER_IP.limit, PER_IP.windowSeconds),
      hitLimit(globalKey, GLOBAL.limit, GLOBAL.windowSeconds),
    ]);
    await audit("login.gagal", { ip: ipHash, percobaan: ipHit.count });
    // Perlambat percobaan menebak kata sandi.
    await new Promise((r) => setTimeout(r, 700));
    if (ipHit.count >= PER_IP.limit || globalHit.count >= GLOBAL.limit) {
      return { error: lockedMessage(Math.max(ipHit.retryAfterSeconds, globalHit.retryAfterSeconds)), attempt };
    }
    return { error: "Kata sandi tidak cocok. Periksa huruf besar dan kecil, lalu coba lagi.", attempt };
  }

  await Promise.all([resetLimit(ipKey), audit("login.berhasil", { ip: ipHash })]);
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  redirect("/peneliti");
}

export async function logout() {
  // Cookie __Host- hanya bisa dihapus dengan atribut yang sama (Secure, path=/).
  (await cookies()).set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  await audit("logout");
  redirect("/peneliti");
}
