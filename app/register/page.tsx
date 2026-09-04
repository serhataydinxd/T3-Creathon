import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
import { registerAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Kayıt",
  description: "Hesap oluşturun; yönetici onayından sonra rolünüz etkinleşir.",
  robots: { index: false, follow: true },
};

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="auth-page" id="main-content">
      <a className="skip-link" href="#main-content">Ana içeriğe geç</a>
      <section className="auth-story">
        <Brand />
        <div><span className="overline">Eğitmen hesabı</span><h1>Atölyeyi katılımcıya<br /><em>yaklaştırın.</em></h1><p>Onaylanmış paketleri kullanın, yazdırın ve oturum deneyiminizi güvenle paylaşın.</p></div>
        <small>Yeni açık kayıtlar güvenlik gereği yalnızca eğitmen rolü alır.</small>
      </section>
      <section className="auth-card"><div><span className="overline">Yeni hesap</span><h2>Eğitmen hesabı oluşturun</h2><p>İçerik ve pedagog rolleri yönetici tarafından atanır.</p></div><AuthForm mode="register" action={registerAction} /></section>
    </main>
  );
}
