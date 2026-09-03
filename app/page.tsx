import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, LockKeyhole, Sparkles, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ALL_ROUTES, CURRICULUM, OUTCOME_IDS } from "@/server/content/curriculum";
import { MATERIAL_IDS } from "@/server/content/materials";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/server/site";

const TIER_LABEL: Record<string, string> = {
  lab: "Atölye donanımı",
  classroom: "Standart sınıf",
  minimal: "Asgari sınıf",
};

const routeCards = ALL_ROUTES.map(({ outcomeId, route }) => {
  const { outcome } = CURRICULUM[outcomeId];
  return {
    id: route.id,
    title: `${outcome.unit} · ${route.name}`,
    meta: `${outcome.gradeLevel}. sınıf · 5E · ${outcome.code}`,
    tier: TIER_LABEL[route.tier] ?? route.tier,
    kind: route.tier === "minimal" ? "ready" : "approved",
  };
});

const corpusStats = {
  outcomes: OUTCOME_IDS.length,
  routes: ALL_ROUTES.length,
  materials: MATERIAL_IDS.length,
};

// Structured data so search engines can render the project as a named
// application rather than an untitled page. Inline JSON-LD is permitted by the
// site's script-src policy.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      name: SITE_NAME,
      url: absoluteUrl("/"),
      description: SITE_DESCRIPTION,
      inLanguage: "tr-TR",
      publisher: { "@id": absoluteUrl("/#team") },
    },
    {
      "@type": "Organization",
      "@id": absoluteUrl("/#team"),
      name: "Node42",
      url: "https://github.com/serhataydinxd/T3-Creathon",
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/"),
      description: SITE_DESCRIPTION,
      inLanguage: "tr-TR",
      audience: {
        "@type": "EducationalAudience",
        educationalRole: "teacher",
      },
      featureList: [
        "Kazanım kilidi ile değiştirilemez öğrenme hedefi",
        "Süre, bütçe, elektrik, internet ve malzemeye göre uyarlama",
        "Grup başına ve sınıf toplamı malzeme listesi ve maliyet",
        "Zorunlu pedagojik inceleme ve onay akışı",
        "Yazdırılabilir eğitimci paketi",
      ],
      isAccessibleForFree: true,
      author: { "@id": absoluteUrl("/#team") },
    },
  ],
};

export default function Home() {
  return (
    <AppShell>
      <script
        type="application/ld+json"
        // The payload is built from local constants, never from user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
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
          <div><span className="stat-icon mint"><CheckCircle2 /></span><strong>{corpusStats.outcomes}</strong><small>Onaylı demo kazanımı</small></div>
          <div><span className="stat-icon amber"><Sparkles /></span><strong>{corpusStats.routes}</strong><small>Doğrulanmış kaynak rotası</small></div>
          <div><span className="stat-icon blue"><Clock3 /></span><strong>{corpusStats.materials}</strong><small>Katalogdaki malzeme</small></div>
          <div><span className="stat-icon coral"><TriangleAlert /></span><strong>5</strong><small>İzlenebilir 5E aşaması</small></div>
        </div>

        <section className="content-section" id="nasil-calisir">
          <div className="section-heading">
            <div><span className="overline">Demo kapsamı</span><h2>Korpustaki kaynak rotaları</h2></div>
            <Link href="/lab">Tümünü gör <ArrowRight size={15} /></Link>
          </div>
          <div className="workshop-list">
            {routeCards.map((item, index) => (
              <article className="workshop-row" key={item.id}>
                <span className="row-index">0{index + 1}</span>
                <div className="row-title"><strong>{item.title}</strong><small>{item.meta}</small></div>
                <span className={`status ${item.kind}`}>{item.tier}</span>
                <Link aria-label={`${item.title} rotasını laboratuvarda aç`} href="/lab"><ArrowRight /></Link>
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
