import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock3, MapPin, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/server/auth/session";
import { applicabilityOf, getLibraryEntry } from "@/server/domain/library";
import { PUBLIC_NARRATIVE_SECTIONS, type ReportNarrative } from "@/server/domain/reports";
import { AGE_COHORTS, WORKSHOP_DOMAINS } from "@/server/content/domains";
import { CENTRES, CENTRE_IDS } from "@/server/content/venues";
import { COMPATIBILITY_LABEL } from "@/server/domain/adaptation";
import { previewAdaptation } from "@/server/domain/adaptation-preview";
import { adaptAction } from "@/app/actions/adaptation";

export const metadata: Metadata = {
  title: "Etkinlik kaydı",
  robots: { index: false, follow: false },
};

const SECTION_LABEL: Record<keyof ReportNarrative, string> = {
  summary: "Yönetici özeti",
  delivery: "Uygulama süreci",
  learning: "Öğrenme kanıtları",
  materials: "Malzeme ve maliyet",
  accessibility: "Erişilebilirlik",
  // Present in the type but never rendered here: the allow-list omits it.
  safety: "",
  nextTime: "Sonraki uygulama",
};

export default async function LibraryEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const previewCentre = typeof search.centre === "string" ? search.centre : "";
  const user = await requireUser();
  let data: Awaited<ReturnType<typeof getLibraryEntry>>;
  try {
    data = await getLibraryEntry(id);
  } catch {
    notFound();
  }
  const { entry, report, adaptationCount } = data;
  const narrative = report?.narrative as ReportNarrative | undefined;

  // The comparison is computed before anything is created, so a trainer sees
  // what adapting would mean rather than finding out from the draft.
  let preview: Awaited<ReturnType<typeof previewAdaptation>> | null = null;
  if (previewCentre !== "" || search.centre !== undefined) {
    preview = await previewAdaptation(entry.deliveryId, previewCentre || null);
  }
  const canAdapt = ["educator", "content_expert", "manager"].includes(user.role);

  return (
    <AppShell user={user}>
      <section className="page">
        <Link className="back-link" href="/library"><ArrowLeft /> Kütüphaneye dön</Link>
        <header className="persisted-header">
          <div>
            <span className="overline">
              {WORKSHOP_DOMAINS[entry.domainId as keyof typeof WORKSHOP_DOMAINS]?.shortLabel ?? entry.domainId}
              {" · "}
              {AGE_COHORTS[entry.cohort as keyof typeof AGE_COHORTS]?.label ?? entry.cohort}
            </span>
            <h1>{entry.title}</h1>
            <p>
              <MapPin size={13} /> {entry.centreName ?? "Okul sınıfı"}
              {entry.centreLocation ? ` · ${entry.centreLocation}` : ""}
              {entry.deliveredOn ? ` · ${entry.deliveredOn}` : ""}
            </p>
          </div>
          <div className="header-tags">
            <span className="workflow-status published" data-testid="entry-applicability">
              {applicabilityOf(entry)}
            </span>
          </div>
        </header>

        <div className="package-meta">
          <span><Clock3 /> {entry.actualMinutes ?? "—"} dakika</span>
          <span><Users /> {entry.actualParticipants ?? "—"} katılımcı</span>
          <span><WalletCards /> {entry.actualCostTry ?? "—"} ₺</span>
          <span data-testid="entry-adaptations">{adaptationCount} uyarlama</span>
        </div>

        {narrative && (
          <section className="panel" data-testid="entry-report">
            {PUBLIC_NARRATIVE_SECTIONS.map((key) => (
              <div key={key}>
                <div className="panel-kicker">{SECTION_LABEL[key]}</div>
                <p>{narrative[key]}</p>
              </div>
            ))}
          </section>
        )}

        {canAdapt && (
          <section className="panel" data-testid="adapt-panel">
            <div className="panel-kicker">Merkezime uyarla</div>
            <p className="panel-help">
              Uyarlama, kaynak paketi ve raporu değiştirmez; kendi merkeziniz için bağımsız bir
              taslak oluşturur. Konu korunur.
            </p>
            <form method="get" className="library-filters">
              <label>
                <span className="visually-hidden">Hedef merkez</span>
                <select name="centre" defaultValue={previewCentre} data-testid="adapt-centre">
                  <option value="">Okul sınıfı</option>
                  {CENTRE_IDS.map((slug) => (
                    <option key={slug} value={slug}>{CENTRES[slug].name}</option>
                  ))}
                </select>
              </label>
              <button className="button" type="submit" data-testid="preview-adapt">
                Uyumu göster
              </button>
            </form>

            {preview && (
              <div className="compatibility" data-testid="compatibility">
                <span
                  className={`status ${preview.status === "compatible" ? "ready" : "approved"}`}
                  data-testid="compatibility-status"
                  data-status={preview.status}
                >
                  {COMPATIBILITY_LABEL[preview.status]}
                </span>
                <ul>
                  {preview.findings.map((finding) => (
                    <li key={finding.code + finding.message} data-severity={finding.severity}>
                      {finding.message}
                    </li>
                  ))}
                </ul>
                {preview.approvedAlternatives.length > 0 && (
                  <p className="panel-help">
                    Aynı konu için onaylı diğer rotalar:{" "}
                    {preview.approvedAlternatives.map((route) => route.routeName).join(", ")}.
                  </p>
                )}
                <form action={adaptAction}>
                  <input type="hidden" name="libraryEntryId" value={entry.id} />
                  <input type="hidden" name="centreSlug" value={previewCentre} />
                  <button className="button primary" type="submit" data-testid="create-adaptation">
                    Bu merkez için taslak oluştur
                  </button>
                </form>
              </div>
            )}
          </section>
        )}

        <p className="panel-help">
          Bu kayıt, uygulayan eğitmenin paylaşım iznine dayanır. Güvenlik olayı notları ve
          bireysel gereksinim açıklamaları buraya aktarılmaz.
        </p>
      </section>
    </AppShell>
  );
}
