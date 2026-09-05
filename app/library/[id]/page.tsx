import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock3, MapPin, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/server/auth/session";
import { applicabilityOf, getLibraryEntry } from "@/server/domain/library";
import { PUBLIC_NARRATIVE_SECTIONS, type ReportNarrative } from "@/server/domain/reports";
import { AGE_COHORTS, WORKSHOP_DOMAINS } from "@/server/content/domains";

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

export default async function LibraryEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  let data: Awaited<ReturnType<typeof getLibraryEntry>>;
  try {
    data = await getLibraryEntry(id);
  } catch {
    notFound();
  }
  const { entry, report, adaptationCount } = data;
  const narrative = report?.narrative as ReportNarrative | undefined;

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

        <p className="panel-help">
          Bu kayıt, uygulayan eğitmenin paylaşım iznine dayanır. Güvenlik olayı notları ve
          bireysel gereksinim açıklamaları buraya aktarılmaz.
        </p>
      </section>
    </AppShell>
  );
}
