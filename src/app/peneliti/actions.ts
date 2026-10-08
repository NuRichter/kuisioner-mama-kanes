"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  passwordMatches,
  researcherAreaConfigured,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";

export interface LoginState {
  error: string | null;
  /** Bertambah pada setiap percobaan gagal; memicu ulang animasi getar di formulir. */
  attempt: number;
}

export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!researcherAreaConfigured()) {
    return { error: "Area peneliti belum dikonfigurasi di server. Atur RESEARCHER_PASSWORD dan SESSION_SECRET.", attempt: prev.attempt + 1 };
  }
  if (!passwordMatches(formData.get("password"))) {
    // Perlambat percobaan menebak kata sandi.
    await new Promise((r) => setTimeout(r, 900));
    return { error: "Kata sandi tidak cocok. Periksa huruf besar dan kecil, lalu coba lagi.", attempt: prev.attempt + 1 };
  }
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  redirect("/peneliti");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/peneliti");
}
