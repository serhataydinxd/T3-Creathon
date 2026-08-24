import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { createRevisionAction, feedbackAction, reviewWorkshopAction, submitWorkshopAction } from "@/app/actions/workshops";
import { publishWorkshopAction } from "@/app/actions/manager";
import { requireUser } from "@/server/auth/session";
import { getReviews, getWorkshop } from "@/server/domain/workshops";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  draft: "Taslak",
  submitted: "Pedagog incelemesinde",
  changes_requested: "Değişiklik istendi",
  approved: "Onaylandı",
  published: "Yayımlandı",
  superseded: "Eski sürüm",
};

export default async function WorkshopPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string; reviewed?: string; feedback?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const notices = await searchParams;
  const workshop = await getWorkshop(user, id);
  if (!workshop) notFound();
  const history = await getReviews(id);
  const plan = workshop.content;
  return (
    <AppShell user={user}>
      <section className="page persisted-workshop">
        {(notices.submitted || notices.reviewed || notices.feedback) && <div className="success-notice" role="status"><CheckCircle2 /> İşlem başarıyla kaydedildi.</div>}
        <header className="persisted-header">
          <div><span className="overline">Fen bilimleri · Sürüm {workshop.version}</span><h1>{workshop.title}</h1><p>{plan.adaptationSummary}</p></div>
          <span data-testid="workflow-status" data-status={workshop.status} className={`workflow-status ${workshop.status}`}>{statusLabels[workshop.status]}</span>
        </header>
        <section className="objective-lock-card"><div className="lock-symbol"><LockKeyhole /></div><div><span className="overline">Kazanım Kilidi · {plan.objective.code}</span><blockquote>{plan.objective.canonicalText}</blockquote><small>{plan.objective.source}</small></div><span className="verified"><ShieldCheck /> Doğrulandı</span></section>
        <div className="package-meta"><span><Clock3 /> {plan.profile.durationMinutes} dakika</span><span><Users /> {plan.profile.classSize} öğrenci · {plan.groupCount} grup</span><span><ShieldCheck /> {plan.findings.filter((finding) => finding.severity === "blocker").length} bloker</span></div>
        <div className="persisted-grid">
          <div className="package-stages">
            {plan.stages.map((stage, index) => <article key={stage.key}><div className="package-stage-title"><span>0{index + 1}</span><div><small>{stage.name} · {stage.minutes} dk</small><h2>{stage.title}</h2></div></div><div className="package-columns"><p><b>Öğretmen</b>{stage.teacherAction}</p><p><b>Öğrenci</b>{stage.studentAction}</p></div><div className="trace-line"><LockKeyhole /><div><strong>Kazanım bağlantısı</strong><p>{stage.objectiveConnection}</p></div></div><div className="evidence-box"><ShieldCheck /><div><strong>Öğrenme kanıtı</strong><p>{stage.evidence}</p></div></div></article>)}
          </div>
          <aside className="workflow-panel no-print">
            <span className="overline">İş akışı</span><h2>Sıradaki karar</h2>
            {workshop.status === "draft" && workshop.createdBy === user.id && <form action={submitWorkshopAction}><input type="hidden" name="id" value={id} /><p>Taslağı ayrı bir pedagogun incelemesine gönderin.</p><button data-testid="submit-for-review" className="button primary wide" type="submit">İncelemeye gönder</button></form>}
            {workshop.status === "changes_requested" && workshop.createdBy === user.id && <form action={createRevisionAction}><input type="hidden" name="id" value={id} /><p>Onay geçmişini koruyarak değiştirilebilir yeni bir sürüm oluşturun.</p><button className="button primary wide" type="submit">Yeni sürüm oluştur</button></form>}
            {workshop.status === "submitted" && user.role === "pedagogue" && <form action={reviewWorkshopAction} className="review-form"><input type="hidden" name="id" value={id} /><label><span>İnceleme notu</span><textarea name="comment" minLength={3} maxLength={1000} required defaultValue="Kazanım bağlantısı ve ölçme kanıtı uygun." /></label><div><button className="button ghost" name="decision" value="changes_requested" type="submit">Değişiklik iste</button><button className="button primary" name="decision" value="approved" type="submit">Pedagojik olarak onayla</button></div></form>}
            {workshop.status === "approved" && user.role === "manager" && <form action={publishWorkshopAction}><input type="hidden" name="id" value={id} /><p>Pedagojik onayı tamamlanan bu değişmez sürümü eğitimcilere açın.</p><button className="button primary wide" type="submit">Paketi yayımla</button></form>}
            {workshop.status === "published" && <><div className="published-note"><CheckCircle2 /><p>Bu sürüm eğitimcilerin kullanımına açıktır.</p></div><Link className="button ghost wide" href={`/print/${id}`} target="_blank">Yazdırma paketini aç</Link></>}
            {workshop.status === "published" && user.role === "educator" && <form action={feedbackAction} className="feedback-form"><input type="hidden" name="id" value={id} /><label><span>Puan</span><select name="rating" defaultValue="5"><option value="5">5 — Çok iyi</option><option value="4">4 — İyi</option><option value="3">3 — Orta</option><option value="2">2 — Zayıf</option><option value="1">1 — Uygun değil</option></select></label><label><span>Sınıf geri bildirimi</span><textarea name="comment" minLength={3} maxLength={1000} required placeholder="Neyin işe yaradığını yazın…" /></label><button className="button primary wide" type="submit">Geri bildirimi kaydet</button></form>}
            {history.length > 0 && <div className="review-history"><h3>Karar geçmişi</h3>{history.map((review) => <div key={`${review.createdAt.toISOString()}-${review.reviewerName}`}><strong>{review.reviewerName}</strong><span>{review.decision === "approved" ? "Onayladı" : "Değişiklik istedi"}</span><p>{review.comment}</p></div>)}</div>}
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
