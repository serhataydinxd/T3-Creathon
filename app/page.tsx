import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, LockKeyhole, Sparkles, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ALL_ROUTES, CURRICULUM, OUTCOME_IDS } from "@/server/content/curriculum";
import { catalogueCoverage } from "@/server/content/catalogue";
import { MATERIAL_IDS } from "@/server/content/materials";
import { AGE_COHORTS, WORKSHOP_DOMAINS } from "@/server/content/domains";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/server/site";

const TIER_LABEL: Record<string, string> = {
  lab: "Atölye donanımı",
  classroom: "Standart sınıf",
  minimal: "Asgari sınıf",
};

const routeCards = ALL_ROUTES.map(({ outcomeId, route }) => {
  const topic = CURRICULUM[outcomeId];
  return {
    id: route.id,
    title: `${topic.title} · ${route.name}`,
    meta: `${WORKSHOP_DOMAINS[topic.domainId].shortLabel} · ${AGE_COHORTS[topic.cohort].label} · 5E`,
    tier: TIER_LABEL[route.tier] ?? route.tier,
    kind: route.tier === "minimal" ? "ready" : "approved",
  };
});

// Measured against Bilim Türkiye's published catalogue rather than against
// our own corpus, so the denominator is the programme and not what we happen
// to have written. Authoring a topic is the only thing that moves it.
const coverage = catalogueCoverage(OUTCOME_IDS.map((id) => CURRICULUM[id]));

const corpusStats = {
  topics: OUTCOME_IDS.length,
  routes: ALL_ROUTES.length,
  materials: MATERIAL_IDS.length,
  entriesAuthored: coverage.entriesAuthored,
  entriesTotal: coverage.entriesTotal,
  domainsCovered: coverage.themesAuthored,
  domainsTotal: coverage.themesTotal,
  cohortsCovered: coverage.cohortsAuthored,
  cohortsTotal: coverage.cohortsTotal,
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
        "Konu kilidi ile değiştirilemez atölye konusu",
        "Merkez donanımına ve eldeki malzemeye göre rota seçimi",
        "Reddedilen rotanın gerekçesinin yazılması",
        "Grup başına ve oturum toplamı malzeme listesi ve maliyet",
        "Zorunlu pedagojik inceleme ve onay akışı",
        "Yazdırılabilir eğitmen paketi",
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
            <h1>Konu sabit.<br /><em>Oturum uyarlanabilir.</em></h1>
            <p className="hero-copy">
              Atölye konusunu değiştirmeden; süre, katılımcı sayısı, bütçe, merkez donanımı ve eldeki malzemeye göre uygulanabilir oturum paketleri üretin.
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
            <div className="core-lock"><LockKeyhole size={30} /><span>Konu<br />Kilidi</span></div>
            <span className="constraint-chip chip-time">40 dakika</span>
            <span className="constraint-chip chip-class">30 öğrenci</span>
            <span className="constraint-chip chip-material">Kâğıt + kalem</span>
            <span className="constraint-chip chip-offline">Çevrimdışı</span>
          </div>
        </div>

        <div className="stats-strip">
          <div><span className="stat-icon mint"><CheckCircle2 /></span><strong>{corpusStats.topics}</strong><small>Atölye konusu</small></div>
          <div><span className="stat-icon amber"><Sparkles /></span><strong>{corpusStats.routes}</strong><small>Kaynak duyarlı rota</small></div>
          <div><span className="stat-icon blue"><Clock3 /></span><strong>{corpusStats.entriesAuthored}/{corpusStats.entriesTotal}</strong><small>Katalog konusu (onaylı içerik)</small></div>
          <div><span className="stat-icon coral"><TriangleAlert /></span><strong>5</strong><small>İzlenebilir 5E aşaması</small></div>
        </div>
        <p className="coverage-note" data-testid="coverage-note">
          Bilim Türkiye kataloğunda {corpusStats.entriesTotal} yayımlanmış atölye konusu var.
          İMKÂN bunların {corpusStats.entriesAuthored} tanesi için onaylı içerik taşıyor
          ({corpusStats.domainsCovered}/{corpusStats.domainsTotal} tema,{" "}
          {corpusStats.cohortsCovered}/{corpusStats.cohortsTotal} yaş grubu); kalan konular için
          pedagog onayına giren taslak öneri üretir.
        </p>

        <section className="content-section" id="nasil-calisir">
          <div className="section-heading">
            <div><span className="overline">Demo kapsamı</span><h2>Atölye konuları ve rotaları</h2></div>
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

        <section className="principles" id="konu-kilidi">
          <div><span>01</span><h3>Konuyu kilitle</h3><p>Seçilen atölye konusu üretim boyunca değiştirilemez ve kaynağıyla gösterilir.</p></div>
          <div><span>02</span><h3>İmkânı tanımla</h3><p>Süre, grup, bütçe, erişilebilirlik, merkez donanımı ve eldeki malzemeyi girin.</p></div>
          <div><span>03</span><h3>Kanıtı görün</h3><p>Her etkinliğin konuyla ilişkisini ve ölçme kanıtını açıkça inceleyin.</p></div>
        </section>
      </section>
    </AppShell>
  );
}
