import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Giriş",
  description: "Rol tabanlı çalışma alanınıza giriş yapın.",
  robots: { index: false, follow: true },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const params = await searchParams;
  return (
    <main className="auth-page" id="main-content">
      <a className="skip-link" href="#main-content">Ana içeriğe geç</a>
      <section className="auth-story">
        <Brand />
        <div><span className="overline">Bilim Türkiye içerik sistemi</span><h1>Gerçek sınıf.<br /><em>Gerçek imkân.</em></h1><p>Kazanımı değiştirmeden uygulanabilir, güvenli ve izlenebilir atölyeler tasarlayın.</p></div>
        <small>Yapay zekâ önerir · Pedagog onaylar · Eğitimci uygular</small>
      </section>
      <section className="auth-card">{params.registered === "pending" && <div className="success-notice" role="status">Hesabınız oluşturuldu. Bir yönetici rolünüzü onayladıktan sonra giriş yapabilirsiniz.</div>}<div><span className="overline">Tekrar hoş geldiniz</span><h2>Hesabınıza giriş yapın</h2><p>Rolünüze uygun çalışma alanına devam edin.</p></div><AuthForm mode="login" action={loginAction} /></section>
    </main>
  );
}
