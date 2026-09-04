import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, Clock3, FlaskConical, Star, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/server/auth/session";
import { listFeedbackRollup, listWorkshops } from "@/server/domain/workshops";
import { listPendingUsers } from "@/server/domain/users";
import { activateUserAction } from "@/app/actions/manager";
import { OUTCOME_IDS } from "@/server/content/curriculum";

export const metadata: Metadata = {
  title: 'Genel bakış',
  // Behind the role guard: a crawler only ever sees a redirect to the login page.
  robots: { index: false, follow: false },
};

const statusLabels: Record<string, string> = {
  draft: "Taslak",
  submitted: "İncelemede",
  changes_requested: "Değişiklik istendi",
  approved: "Onaylandı",
  published: "Yayımlandı",
  superseded: "Eski sürüm",
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string; error?: string; activated?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const workshops = await listWorkshops(user);
  const pendingUsers = user.role === "manager" ? await listPendingUsers(user) : [];
  const feedbackRollup = user.role === "manager" ? await listFeedbackRollup(user) : [];
  const canCreate = user.role === "content_expert" || user.role === "pedagogue";
  return (
    <AppShell user={user}>
      <section className="page role-dashboard">
        {params.welcome && <div className="success-notice" role="status"><CheckCircle2 /> Hesabınız oluşturuldu. Eğitmen çalışma alanınız hazır.</div>}
        {params.error === "forbidden" && <div className="error-notice" role="alert">Bu alan için yetkiniz yok.</div>}
        {params.activated && <div className="success-notice" role="status"><CheckCircle2 /> Kullanıcı rolü etkinleştirildi.</div>}
        <div className="dashboard-welcome">
          <div><span className="overline">Rol çalışma alanı</span><h1>Merhaba, {user.name.split(" ")[0]}.</h1><p>{canCreate ? "Yeni bir atölye tasarlayın veya inceleme durumlarını takip edin." : user.role === "educator" ? "Onaylanmış atölye paketlerini açın, yazdırın ve oturum geri bildirimi bırakın." : "İçerik üretimi, inceleme ve kullanım durumunu yönetin."}</p></div>
          {canCreate && <Link className="button primary" href="/lab">Yeni atölye tasarla <ArrowRight /></Link>}
        </div>
        <div className="role-stats">
          <div><FlaskConical /><strong>{workshops.length}</strong><span>Görünen paket</span></div>
          <div><Clock3 /><strong>{workshops.filter((item) => item.status === "submitted").length}</strong><span>İnceleme bekliyor</span></div>
          <div><BookOpenCheck /><strong>{workshops.filter((item) => item.status === "published").length}</strong><span>Yayımlanmış</span></div>
          <div><Users /><strong>{OUTCOME_IDS.length}</strong><span>Onaylı kazanım</span></div>
        </div>
        {user.role === "manager" && <section className="pending-users"><div className="section-heading"><div><span className="overline">Hesap güvenliği</span><h2>Onay bekleyen kayıtlar</h2></div></div>{pendingUsers.length === 0 ? <p>Onay bekleyen kullanıcı yok.</p> : pendingUsers.map((pending) => <form action={activateUserAction} key={pending.id}><div><strong>{pending.name}</strong><small>{pending.email}</small></div><input type="hidden" name="userId" value={pending.id} /><label><span>Atanacak rol</span><select name="role" defaultValue="educator"><option value="educator">Eğitmen</option><option value="content_expert">İçerik uzmanı</option><option value="pedagogue">Pedagog</option></select></label><button className="button primary" type="submit">Etkinleştir</button></form>)}</section>}
        {user.role === "manager" && feedbackRollup.length > 0 && <section className="feedback-rollup" data-testid="feedback-rollup"><div className="section-heading"><div><span className="overline">Yeniden kullanım</span><h2>Oturum geri bildirimi özeti</h2></div><span>{feedbackRollup.reduce((sum, row) => sum + row.count, 0)} geri bildirim</span></div><div className="rollup-list">{feedbackRollup.map((row) => <Link className="rollup-row" data-testid={`rollup-${row.versionId}`} href={`/workshops/${row.versionId}`} key={row.versionId}><div><strong>{row.title}</strong><small>Sürüm {row.version}</small></div><span className="rollup-score"><Star /> {row.averageRating} / 5</span><small>{row.count} eğitmen</small><ArrowRight /></Link>)}</div></section>}
        <section className="dashboard-list">
          <div className="section-heading"><div><span className="overline">İş akışı</span><h2>{user.role === "educator" ? "Kullanılabilir paketler" : "Atölyeler"}</h2></div></div>
          {workshops.length === 0 ? (
            <div className="empty-state"><FlaskConical /><h3>Henüz burada bir atölye yok.</h3><p>{canCreate ? "İlk kaynak-duyarlı atölyenizi tasarlayarak başlayın." : "Pedagog tarafından yayımlanan paketler burada görünecek."}</p>{canCreate && <Link className="button primary" href="/lab">Atölye tasarla</Link>}</div>
          ) : (
            <div className="workshop-list">
              {workshops.map((workshop, index) => <article data-testid="version-card" data-status={workshop.status} data-version-id={workshop.id} className="workshop-row" key={workshop.id}><span className="row-index">{String(index + 1).padStart(2, "0")}</span><div className="row-title"><strong>{workshop.title}</strong><small>{workshop.authorName} · Sürüm {workshop.version}</small></div><span className={`status ${workshop.status === "published" ? "approved" : workshop.status === "submitted" ? "ready" : "warning"}`}>{statusLabels[workshop.status]}</span><Link href={`/workshops/${workshop.id}`} aria-label={`${workshop.title} paketini aç`}><ArrowRight /></Link></article>)}
            </div>
          )}
        </section>
      </section>
    </AppShell>
  );
}
