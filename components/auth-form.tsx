"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, CircleAlert, LockKeyhole } from "lucide-react";
import type { AuthState } from "@/app/actions/auth";

const initialState: AuthState = {};

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "register";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const register = mode === "register";

  return (
    <form action={formAction} className="auth-form">
      {state.error && <div className="auth-error" role="alert"><CircleAlert /> {state.error}</div>}
      {register && (
        <label>
          <span>Ad soyad</span>
          <input data-testid="register-name" name="name" type="text" autoComplete="name" minLength={2} maxLength={80} required />
        </label>
      )}
      <label>
        <span>E-posta adresi</span>
        <input data-testid={`${mode}-email`} name="email" type="email" autoComplete="email" maxLength={254} required />
      </label>
      <label>
        <span>Şifre</span>
        <input data-testid={`${mode}-password`} name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 12 : 1} maxLength={128} required />
        {register && <small>En az 12 karakter kullanın.</small>}
      </label>
      {register && (
        <label className="terms-check">
          <input name="terms" type="checkbox" required />
          <span>Demo kullanım koşullarını ve öğrenci kişisel verisi girmemeyi kabul ediyorum.</span>
        </label>
      )}
      <button data-testid={`${mode}-submit`} className="button primary wide" disabled={pending} type="submit">
        {pending ? "İşleniyor…" : register ? "Hesap oluştur" : "Giriş yap"} <ArrowRight />
      </button>
      <div className="auth-switch">
        {register ? "Zaten hesabınız var mı?" : "Henüz hesabınız yok mu?"}{" "}
        <Link href={register ? "/login" : "/register"}>{register ? "Giriş yapın" : "Hesap oluşturun"}</Link>
      </div>
      <div className="auth-privacy"><LockKeyhole /> Oturum çerezi HttpOnly olarak saklanır.</div>
    </form>
  );
}
