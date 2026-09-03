import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getWorkshop } from "@/server/domain/workshops";

export const metadata: Metadata = {
  // Approved packages are readable only by signed-in roles, and the print pack
  // must never be indexed as a standalone document.
  robots: { index: false, follow: false },
};


export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const workshop = await getWorkshop(user, id);
  if (!workshop || workshop.status !== "published") notFound();
  const plan = workshop.content;
  return (
    <main className="print-document">
      <header><strong>İMKÂN</strong><span>Onaylı eğitimci paketi · Sürüm {workshop.version} · {plan.mode === "LIVE" ? "Yapay zekâ üretimi" : "Çevrimdışı plan"}</span><h1>{workshop.title}</h1><p>{plan.adaptationSummary}</p></header>
      <section className="print-objective"><b>Kazanım Kilidi · {plan.objective.code}</b><p>{plan.objective.canonicalText}</p><small>{plan.objective.source} · Paket kimliği: {workshop.id}</small></section>
      <dl><div><dt>Süre</dt><dd>{plan.profile.durationMinutes} dakika</dd></div><div><dt>Sınıf</dt><dd>{plan.profile.classSize} öğrenci</dd></div><div><dt>Gruplar</dt><dd>{plan.groupCount} grup</dd></div><div><dt>Maliyet</dt><dd>{plan.estimatedCostTry} ₺</dd></div></dl>
      {plan.materialPlan && plan.materialPlan.length > 0 && (
        <section className="print-materials">
          <b>Malzeme listesi · {plan.groupCount} grup</b>
          <table>
            <thead><tr><th scope="col">Malzeme</th><th scope="col">Grup başına</th><th scope="col">Sınıf toplamı</th><th scope="col">Toplam</th><th scope="col">Durum</th></tr></thead>
            <tbody>
              {plan.materialPlan.map((line) => <tr key={line.key}><th scope="row">{line.label}</th><td>{line.quantityPerGroup}</td><td>{line.totalQuantity}</td><td>{line.totalCostTry} ₺</td><td>{line.inInventory ? "Envanterde" : "Temin edilmeli"}</td></tr>)}
            </tbody>
            <tfoot><tr><th scope="row">Tahmini toplam</th><td colSpan={2} /><td>{plan.estimatedCostTry} ₺</td><td /></tr></tfoot>
          </table>
          {plan.costs && (
            <p className="print-costs">
              <span>Temin bedeli: <b>{plan.costs.acquisitionTry} ₺</b></span>
              <span>Sarf bedeli: <b>{plan.costs.lessonTry} ₺</b></span>
              <span>Fiyat tarihi: <b>{plan.costs.pricedOn}</b></span>
            </p>
          )}
        </section>
      )}
      {plan.stages.map((stage, index) => <article key={stage.key}><span>0{index + 1} · {stage.name} · {stage.minutes} dk</span><h2>{stage.title}</h2><p><b>Öğretmen:</b> {stage.teacherAction}</p><p><b>Öğrenci:</b> {stage.studentAction}</p><p><b>Kazanımla bağlantı:</b> {stage.objectiveConnection}</p><p><b>Kanıt:</b> {stage.evidence}</p></article>)}
      <footer>İ ı Ğ ğ Ş ş Ç ç Ö ö Ü ü · Kazanım sabit, atölye uyarlanabilir.</footer>
    </main>
  );
}
