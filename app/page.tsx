import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, LockKeyhole, Sparkles, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const recent = [
  { title: "Elektrik Devreleri · Kısıtlı kaynak", meta: "7. sınıf · 5E · 40 dk", status: "İncelemeye hazır", kind: "ready" },
  { title: "Elektrik Devreleri · Tam donanım", meta: "7. sınıf · 5E · 60 dk", status: "Pedagog onayladı", kind: "approved" },
  { title: "Elektrik Devreleri · Çevrimdışı", meta: "7. sınıf · 5E · 40 dk", status: "2 uyarı", kind: "warning" },
];

export default function Home() {
  return (
    <AppShell>
      <section className="page dashboard-page">
        <div className="hero-grid">
          <div>
            <span className="overline">Bilim Türkiye · İçerik üretim sistemi</span>
            <h1>Kazanım sabit.<br /><em>Atölye uyarlanabilir.</em></h1>
            <p className="hero-copy">
              Öğrenme hedefini değiştirmeden; süre, sınıf, bütçe ve mevcut malzemelere göre uygulanabilir atölye paketleri üretin.
            </p>
            <div className="hero-actions">
              <Link className="button primary" href="/lab">
                Yeni atölye tasarla <ArrowRight size={18} />
              </Link>
              <a className="button ghost" href="#nasil-calisir">Nasıl çalışır?</a>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="core-lock"><LockKeyhole size={30} /><span>Kazanım<br />Kilidi</span></div>
            <span className="constraint-chip chip-time">40 dakika</span>
            <span className="constraint-chip chip-class">30 öğrenci</span>
            <span className="constraint-chip chip-material">Kâğıt + kalem</span>
            <span className="constraint-chip chip-offline">Çevrimdışı</span>
          </div>
        </div>

        <div className="stats-strip">
          <div><span className="stat-icon mint"><CheckCircle2 /></span><strong>12</strong><small>Onaylı kazanım</small></div>
          <div><span className="stat-icon amber"><Sparkles /></span><strong>8</strong><small>Güvenli etkinlik</small></div>
          <div><span className="stat-icon blue"><Clock3 /></span><strong>4</strong><small>İnceleme bekliyor</small></div>
          <div><span className="stat-icon coral"><TriangleAlert /></span><strong>0</strong><small>Güvenlik ihlali</small></div>
        </div>

        <section className="content-section" id="nasil-calisir">
          <div className="section-heading">
            <div><span className="overline">Son çalışmalar</span><h2>Atölye paketleri</h2></div>
            <Link href="/lab">Tümünü gör <ArrowRight size={15} /></Link>
          </div>
          <div className="workshop-list">
            {recent.map((item, index) => (
              <article className="workshop-row" key={item.title}>
                <span className="row-index">0{index + 1}</span>
                <div className="row-title"><strong>{item.title}</strong><small>{item.meta}</small></div>
                <span className={`status ${item.kind}`}>{item.status}</span>
                <Link aria-label={`${item.title} atölyesini aç`} href="/lab"><ArrowRight /></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="principles" id="kazanım-kilidi">
          <div><span>01</span><h3>Kazanımı kilitle</h3><p>Onaylı hedef, üretim boyunca değiştirilemez ve kaynak metinden gösterilir.</p></div>
          <div><span>02</span><h3>İmkânı tanımla</h3><p>Süre, grup, bütçe, erişilebilirlik ve sınıftaki gerçek malzemeleri girin.</p></div>
          <div><span>03</span><h3>Kanıtı görün</h3><p>Her etkinliğin kazanımla ilişkisini ve ölçme kanıtını açıkça inceleyin.</p></div>
        </section>
      </section>
    </AppShell>
  );
}
