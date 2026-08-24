"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CircleHelp, FlaskConical, LayoutDashboard, LockKeyhole } from "lucide-react";
import { Brand } from "./brand";
import { logoutAction } from "@/app/actions/auth";
import type { AuthUser } from "@/server/auth/session";

const roleLabels: Record<AuthUser["role"], string> = {
  content_expert: "İçerik uzmanı",
  pedagogue: "Pedagog",
  educator: "Eğitimci",
  manager: "Yönetici",
};

export function AppShell({ children, user }: { children: React.ReactNode; user?: AuthUser | null }) {
  const pathname = usePathname();
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Ana içeriğe geç</a>
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Ana menü" className="side-nav">
          <Link className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`} href={user ? "/dashboard" : "/"}>
            <LayoutDashboard size={18} /> Genel bakış
          </Link>
          <Link className={`nav-item ${pathname === "/lab" ? "active" : ""}`} href={user ? "/lab" : "/login"}>
            <FlaskConical size={18} /> Atölye laboratuvarı
          </Link>
          <Link className="nav-item" href="/#kazanım-kilidi">
            <LockKeyhole size={18} /> Kazanım Kilidi
          </Link>
          <a className={`nav-item ${pathname === "/about" ? "active" : ""}`} href="/about#kaynaklar">
            <BookOpen size={18} /> İçerik kütüphanesi
          </a>
        </nav>
        <div className="side-bottom">
          <div className="protocol-card">
            <span className="eyebrow">Güvence katmanı</span>
            <strong>İnsan onayı zorunlu</strong>
            <p>Yapay zekâ önerir. Pedagog inceler. Eğitimci uygular.</p>
          </div>
          <a className="nav-item" href="/about">
            <CircleHelp size={18} /> Proje hakkında
          </a>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="demo-status">
            <span className="pulse-dot" /> Güvenli demo ortamı
          </div>
          {user ? (
            <div className="user-area">
              <div className="user-pill">
                <span className="avatar">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                <span><strong>{user.name}</strong><small>{roleLabels[user.role]}</small></span>
              </div>
              <form action={logoutAction}><button className="logout-button" type="submit">Çıkış</button></form>
            </div>
          ) : (
            <Link className="button primary" href="/login">Giriş yap</Link>
          )}
        </header>
        <main id="main-content">{children}</main>
      </div>
    </div>
  );
}
