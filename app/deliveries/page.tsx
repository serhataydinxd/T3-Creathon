import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/server/auth/session";
import { listDeliveries } from "@/server/domain/deliveries";

export const metadata: Metadata = {
  title: "Etkinlik raporları",
  robots: { index: false, follow: false },
};

const VISIBILITY_LABEL = {
  private: "Yalnızca ben",
  centre: "Merkezim",
  public: "Paylaşılabilir",
} as const;

export default async function DeliveriesPage() {
  const user = await requireUser();
  // An educator sees their own records; reviewers see all of them. Filtered in
  // the query rather than in the markup, so a hidden row is never fetched.
  const deliveries = await listDeliveries(user);

  return (
    <AppShell user={user}>
      <section className="page">
        <div className="section-heading">
          <div>
            <span className="overline">Etkinlik raporları</span>
            <h1>Uygulama kayıtları</h1>
          </div>
        </div>
        {deliveries.length === 0 ? (
          <div className="empty-state" data-testid="deliveries-empty">
            <ClipboardList />
            <h3>Henüz uygulama kaydı yok.</h3>
            <p>
              Yayımlanmış bir atölye paketini açıp &quot;Uygulama raporu oluştur&quot; ile
              başlayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="workshop-list" data-testid="delivery-list">
            {deliveries.map((delivery, index) => (
              <article className="workshop-row" key={delivery.id} data-testid={`delivery-${delivery.id}`}>
                <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="row-title">
                  <strong>{delivery.versionTitle}</strong>
                  <small>
                    {delivery.centreName ?? "Okul sınıfı"} · {delivery.deliveredOn ?? "tarih girilmedi"} ·{" "}
                    {delivery.educatorName}
                  </small>
                </div>
                <span className="status">{VISIBILITY_LABEL[delivery.visibility]}</span>
                <Link aria-label={`${delivery.versionTitle} raporunu aç`} href={`/deliveries/${delivery.id}`}>
                  <ArrowRight />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
