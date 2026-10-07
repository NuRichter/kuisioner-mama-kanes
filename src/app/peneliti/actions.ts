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
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!researcherAreaConfigured()) {
    return { error: "Area peneliti belum dikonfigurasi di server. Atur RESEARCHER_PASSWORD dan SESSION_SECRET." };
  }
  if (!passwordMatches(formData.get("password"))) {
    // Perlambat percobaan menebak kata sandi.
    await new Promise((r) => setTimeout(r, 900));
    return { error: "Kata sandi tidak cocok. Periksa huruf dan tanda hubung, lalu coba lagi." };
  }
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  redirect("/peneliti");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/peneliti");
}
