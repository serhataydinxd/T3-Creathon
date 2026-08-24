"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, deleteSession } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { clearLoginFailures, loginBlocked, recordLoginFailure, withHashCapacity } from "@/server/auth/rate-limit";

export type AuthState = { error?: string };

function hasDatabaseCode(error: unknown, code: string): boolean {
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const candidate = current as { code?: string; cause?: unknown };
    if (candidate.code === code) return true;
    current = candidate.cause;
  }
  return false;
}

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(12, "Şifre en az 12 karakter olmalı.").max(128);

export async function registerAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı.").max(80),
      email: emailSchema,
      password: passwordSchema,
      terms: z.literal("on", { error: "Kullanım koşullarını kabul etmelisiniz." }),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin." };

  try {
    await getDb()
      .insert(users)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await withHashCapacity(() => hashPassword(parsed.data.password)),
        role: null,
        status: "pending",
      });
  } catch (error) {
    if (hasDatabaseCode(error, "23505")) return { error: "Bu e-posta adresiyle zaten bir hesap var." };
    return { error: "Hesap şu anda oluşturulamadı. Lütfen tekrar deneyin." };
  }

  redirect("/login?registered=pending");
}

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1).max(128) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "E-posta veya şifre hatalı." };
  const rateKey = parsed.data.email;
  if (loginBlocked(rateKey)) return { error: "Çok fazla başarısız deneme. Lütfen 15 dakika sonra tekrar deneyin." };

  const [user] = await getDb()
    .select({ id: users.id, passwordHash: users.passwordHash, status: users.status, role: users.role })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (!user) {
    await withHashCapacity(() => hashPassword(parsed.data.password));
    recordLoginFailure(rateKey);
    return { error: "E-posta veya şifre hatalı." };
  }
  const valid = await withHashCapacity(() => verifyPassword(user.passwordHash, parsed.data.password));
  if (!valid) {
    recordLoginFailure(rateKey);
    return { error: "E-posta veya şifre hatalı." };
  }
  if (user.status === "pending" || !user.role) return { error: "Hesabınız henüz yönetici tarafından etkinleştirilmedi." };
  if (user.status === "disabled") return { error: "Hesabınız devre dışı bırakılmış." };

  clearLoginFailures(rateKey);
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
