import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getDelivery } from "@/server/domain/deliveries";
import { NARRATIVE_SECTIONS, reportHistory, type ReportNarrative } from "@/server/domain/reports";
import { MATERIALS } from "@/server/content/materials";
import { STAGE_IDENTITY, type StageKey } from "@/server/content/curriculum";
import { AGE_COHORTS, WORKSHOP_DOMAINS } from "@/server/content/domains";
import type { WorkshopPlan } from "@/server/domain/types";

export const metadata: Metadata = {
  title: "Uygulama raporu · yazdır",
  // Reports carry centre-internal observations; never indexable.
  robots: { index: false, follow: false },
};

const SECTION_LABEL: Record<keyof ReportNarrative, string> = {
  summary: "Yönetici özeti",
  delivery: "Uygulama süreci ve değişiklikler",
  learning: "Öğrenme kanıtları ve eğitmen gözlemleri",
  materials: "Gerçek malzeme ve maliyet",
  accessibility: "Erişilebilirlik",
  safety: "Güvenlik ve olay kaydı",
  nextTime: "Sonraki uygulama önerileri",
};

const OUTCOME_LABEL = { applied: "Uygulandı", modified: "Değiştirildi", skipped: "Atlandı" };
const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

/**
 * The printable delivery report.
 *
 * This is the centre's own document, so it carries the safety section the
 * public library never sees. What it does not carry is any individual: every
 * participation figure is an aggregate, by construction — the record has
 * nowhere to put a child's name.
 */
export default async function DeliveryPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  let delivery: Awaited<ReturnType<typeof getDelivery>>;
  try {
    delivery = await getDelivery(user, id);
  } catch {
    notFound();
  }
  const report = delivery.report;
  if (!report) notFound();

  const plan = delivery.record.planSnapshot as WorkshopPlan;
  const narrative = report.narrative as ReportNarrative;
  const history = await reportHistory(id);

  return (
    <main className="print-document report-print">
      {/*
        * The print sheet has no app chrome, so without this there is no way
        * back and no way to sign out — a dead end for anyone who lands here
        * from a link rather than from the report page.
        */}
      <nav className="print-back no-print">
        <Link href={`/deliveries/${id}`}>← Rapora dön</Link>
      </nav>
      <header>
        <span className="print-eyebrow">İMKÂN · Uygulama Raporu</span>
        <h1>{plan.title}</h1>
        <p>
          {WORKSHOP_DOMAINS[plan.domainId as keyof typeof WORKSHOP_DOMAINS]?.label ?? plan.domainId}
          {" · "}
          {AGE_COHORTS[plan.cohort as keyof typeof AGE_COHORTS]?.label ?? plan.cohort}
          {" · "}
          Kaynak sürüm {delivery.versionNumber}
        </p>
      </header>

      <section>
        <h2>Kimlik ve kaynak</h2>
        <dl className="print-pairs">
          <div><dt>Merkez</dt><dd>{delivery.centreName ?? "Okul sınıfı"}</dd></div>
          <div><dt>Tarih</dt><dd>{delivery.record.deliveredOn ?? "Belirtilmedi"}</dd></div>
          <div><dt>Uygulayan</dt><dd>{delivery.educatorName}</dd></div>
          <div><dt>Atölye konusu</dt><dd>{plan.objective.canonicalText}</dd></div>
          <div>
            <dt>Kazanım eşlemesi</dt>
            <dd>
              {plan.objective.verification === "verified"
                ? `${plan.objective.code} · doğrulandı`
                : plan.objective.verification === "none"
                  ? "Bu konu için kazanım eşlemesi tanımlı değil"
                  : `${plan.objective.code} · uzman doğrulaması bekliyor`}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h2>Planlanan ve gerçekleşen</h2>
        <table className="print-table">
          <thead>
            <tr><th scope="col">Ölçüt</th><th scope="col">Planlanan</th><th scope="col">Gerçekleşen</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row">Süre</th><td>{plan.profile.durationMinutes} dk</td><td>{delivery.record.actualMinutes ?? "Belirtilmedi"}</td></tr>
            <tr><th scope="row">Katılımcı</th><td>{plan.profile.classSize}</td><td>{delivery.record.actualParticipants ?? "Belirtilmedi"}</td></tr>
            <tr><th scope="row">Grup</th><td>{plan.groupCount}</td><td>{delivery.record.actualGroups ?? "Belirtilmedi"}</td></tr>
            <tr><th scope="row">Maliyet</th><td>{plan.estimatedCostTry} ₺</td><td>{delivery.record.actualCostTry ?? "Belirtilmedi"}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Aşamalar</h2>
        <table className="print-table">
          <thead>
            <tr><th scope="col">Aşama</th><th scope="col">Durum</th><th scope="col">Neden / gözlenen kanıt</th></tr>
          </thead>
          <tbody>
            {delivery.stages.map((stage) => (
              <tr key={stage.stageKey}>
                <th scope="row">{STAGE_IDENTITY[stage.stageKey as StageKey]?.name ?? stage.stageKey}</th>
                <td>{OUTCOME_LABEL[stage.outcome]}</td>
                <td>
                  {[stage.note, stage.evidenceObserved].filter(Boolean).join(" · ") || "Belirtilmedi"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Malzeme</h2>
        <table className="print-table">
          <thead>
            <tr><th scope="col">Malzeme</th><th scope="col">Planlanan</th><th scope="col">Kullanılan</th><th scope="col">Yerine</th></tr>
          </thead>
          <tbody>
            {delivery.materials.map((line) => (
              <tr key={line.materialId}>
                <th scope="row">{MATERIALS[line.materialId as keyof typeof MATERIALS]?.label ?? line.materialId}</th>
                <td>{line.plannedQuantity ?? "—"}</td>
                <td>{line.actualQuantity ?? "Belirtilmedi"}</td>
                <td>
                  {line.substituteMaterialId
                    ? MATERIALS[line.substituteMaterialId as keyof typeof MATERIALS]?.label ?? line.substituteMaterialId
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {NARRATIVE_SECTIONS.map((key) => (
        <section key={key}>
          <h2>{SECTION_LABEL[key]}</h2>
          <p>{narrative[key]}</p>
        </section>
      ))}

      <section>
        <h2>Hazırlayan, inceleyen ve onaylayan</h2>
        <table className="print-table">
          <thead>
            <tr><th scope="col">Sürüm</th><th scope="col">Durum</th><th scope="col">Metin kaynağı</th><th scope="col">Zaman</th></tr>
          </thead>
          <tbody>
            {history.map((entry) => (
              <tr key={entry.id}>
                <th scope="row">{entry.version}</th>
                <td>{entry.status}</td>
                <td>{entry.mode === "live" ? `yapay zekâ · ${entry.providerModel ?? "model"}` : "kayıttan"}</td>
                <td>{dateFormat.format(entry.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer>
        Katılım bilgileri toplu sayıdır; bu rapor hiçbir çocuğa ait kişisel veri
        içermez. Güvenlik ve olay kaydı merkez içidir ve etkinlik kütüphanesine
        aktarılmaz.
      </footer>
    </main>
  );
}
