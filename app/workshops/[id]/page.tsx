import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, LockKeyhole, ShieldCheck, Star, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { createRevisionAction, feedbackAction, reviewWorkshopAction, submitWorkshopAction } from "@/app/actions/workshops";
import { publishWorkshopAction } from "@/app/actions/manager";
import { requireUser } from "@/server/auth/session";
import { getFeedbackSummary, getReviews, getWorkshop } from "@/server/domain/workshops";
import { MaterialLedger } from "@/components/material-ledger";
import { planContext } from "@/components/plan-context";
import { ObjectiveLockBadge } from "@/components/objective-lock-badge";
import { RouteDecisions } from "@/components/route-decisions";
import Link from "next/link";

export const metadata: Metadata = {
  // Approved packages are readable only by signed-in roles, and the print pack
  // must never be indexed as a standalone document.
  robots: { index: false, follow: false },
};


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
  const feedback = await getFeedbackSummary(user, id);
  const plan = workshop.content;
  return (
    <AppShell user={user}>
      <section className="page persisted-workshop">
        {(notices.submitted || notices.reviewed || notices.feedback) && <div className="success-notice" role="status"><CheckCircle2 /> İşlem başarıyla kaydedildi.</div>}
        <header className="persisted-header">
          <div><span className="overline">{planContext(plan)} · Sürüm {workshop.version}</span><h1>{workshop.title}</h1><p>{plan.adaptationSummary}</p></div>
          <div className="header-tags"><span data-testid="plan-mode" data-mode={plan.mode} className={`mode-tag ${plan.mode === "LIVE" ? "live" : "replay"}`}>{plan.mode === "LIVE" ? "CANLI ÜRETİM" : "REPLAY"}</span><span data-testid="workflow-status" data-status={workshop.status} className={`workflow-status ${workshop.status}`}>{statusLabels[workshop.status]}</span></div>
        </header>
        <section className="objective-lock-card"><div className="lock-symbol"><LockKeyhole /></div><div><span className="overline">Konu Kilidi · {plan.objective.code}</span><blockquote>{plan.objective.canonicalText}</blockquote><small>{plan.objective.source}</small></div><ObjectiveLockBadge plan={plan} /></section>
        <div className="package-meta"><span><Clock3 /> {plan.profile.durationMinutes} dakika</span><span><Users /> {plan.profile.classSize} öğrenci · {plan.groupCount} grup</span><span><ShieldCheck /> {plan.findings.filter((finding) => finding.severity === "blocker").length} bloker</span></div>
        {plan.materialPlan && <MaterialLedger plan={plan} />}
        <RouteDecisions plan={plan} />
        <div className="persisted-grid">
          <div className="package-stages">
            {plan.stages.map((stage, index) => <article key={stage.key}><div className="package-stage-title"><span>0{index + 1}</span><div><small>{stage.name} · {stage.minutes} dk</small><h2>{stage.title}</h2></div></div><div className="package-columns"><p><b>Eğitmen</b>{stage.teacherAction}</p><p><b>Öğrenci</b>{stage.studentAction}</p></div><div className="trace-line"><LockKeyhole /><div><strong>Konu bağlantısı</strong><p>{stage.objectiveConnection}</p></div></div><div className="evidence-box"><ShieldCheck /><div><strong>Öğrenme kanıtı</strong><p>{stage.evidence}</p></div></div></article>)}
          </div>
          <aside className="workflow-panel no-print">
            <span className="overline">İş akışı</span><h2>Sıradaki karar</h2>
            {workshop.status === "draft" && workshop.createdBy === user.id && <form action={submitWorkshopAction}><input type="hidden" name="id" value={id} /><p>Taslağı ayrı bir pedagogun incelemesine gönderin.</p><button data-testid="submit-for-review" className="button primary wide" type="submit">İncelemeye gönder</button></form>}
            {workshop.status === "changes_requested" && workshop.createdBy === user.id && <form action={createRevisionAction}><input type="hidden" name="id" value={id} /><p>Onay geçmişini koruyarak değiştirilebilir yeni bir sürüm oluşturun.</p><button className="button primary wide" type="submit">Yeni sürüm oluştur</button></form>}
            {workshop.status === "submitted" && user.role === "pedagogue" && <form action={reviewWorkshopAction} className="review-form"><input type="hidden" name="id" value={id} /><label><span>İnceleme notu</span><textarea name="comment" minLength={3} maxLength={1000} required defaultValue="Konu bağlantısı ve ölçme kanıtı uygun." /></label><div><button className="button ghost" name="decision" value="changes_requested" type="submit">Değişiklik iste</button><button className="button primary" name="decision" value="approved" type="submit">Pedagojik olarak onayla</button></div></form>}
            {workshop.status === "approved" && user.role === "manager" && <form action={publishWorkshopAction}><input type="hidden" name="id" value={id} /><p>Pedagojik onayı tamamlanan bu değişmez sürümü eğitmenlere açın.</p><button className="button primary wide" type="submit">Paketi yayımla</button></form>}
            {workshop.status === "published" && <><div className="published-note"><CheckCircle2 /><p>Bu sürüm eğitmenlerin kullanımına açıktır.</p></div><Link className="button ghost wide" href={`/print/${id}`} target="_blank">Yazdırma paketini aç</Link></>}
            {workshop.status === "published" && user.role === "educator" && <form action={feedbackAction} className="feedback-form"><input type="hidden" name="id" value={id} /><label><span>Puan</span><select name="rating" defaultValue="5"><option value="5">5 — Çok iyi</option><option value="4">4 — İyi</option><option value="3">3 — Orta</option><option value="2">2 — Zayıf</option><option value="1">1 — Uygun değil</option></select></label><label><span>Oturum geri bildirimi</span><textarea name="comment" minLength={3} maxLength={1000} required placeholder="Neyin işe yaradığını yazın…" /></label><button className="button primary wide" type="submit">Geri bildirimi kaydet</button></form>}
            {history.length > 0 && <div className="review-history"><h3>Karar geçmişi</h3>{history.map((review) => <div key={`${review.createdAt.toISOString()}-${review.reviewerName}`}><strong>{review.reviewerName}</strong><span>{review.decision === "approved" ? "Onayladı" : "Değişiklik istedi"}</span><p>{review.comment}</p></div>)}</div>}
            {feedback.count > 0 && <div className="review-history feedback-history" data-testid="feedback-summary"><h3>Oturum geri bildirimi</h3><p className="feedback-average"><Star /> <strong data-testid="feedback-average">{feedback.averageRating}</strong> / 5 · {feedback.count} eğitmen</p><div className="rating-bars">{feedback.distribution.map((bucket) => <div key={bucket.rating}><span>{bucket.rating}</span><i><b style={{ width: `${bucket.share}%` }} /></i><small>{bucket.count}</small></div>)}</div>{feedback.entries.map((entry) => <div key={`${entry.createdAt.toISOString()}-${entry.educatorName}`}><strong>{entry.own ? "Siz" : entry.educatorName}</strong><span>{entry.rating}/5</span><p>{entry.comment}</p></div>)}</div>}
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
