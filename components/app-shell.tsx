"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CircleHelp, FlaskConical, LayoutDashboard, LockKeyhole } from "lucide-react";
import { Brand } from "./brand";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Ana menü" className="side-nav">
          <Link className={`nav-item ${pathname === "/" ? "active" : ""}`} href="/">
            <LayoutDashboard size={18} /> Genel bakış
          </Link>
          <Link className={`nav-item ${pathname === "/lab" ? "active" : ""}`} href="/lab">
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
          <div className="user-pill">
            <span className="avatar">SA</span>
            <span><strong>Selin Aksoy</strong><small>İçerik uzmanı</small></span>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
